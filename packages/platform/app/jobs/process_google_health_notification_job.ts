import ProviderAccount from '#models/provider_account';
import { GoogleHealthService } from '#services/google_health_service';
import logger from '@adonisjs/core/services/logger';
import { Job } from '@adonisjs/queue';
import { DateTime } from 'luxon';

export interface GoogleHealthNotification {
  healthUserId: string;
  operation: 'UPSERT' | 'DELETE';
  dataType: string;
  intervals?: Array<{
    physicalTimeInterval: { startTime: string; endTime: string };
  }>;
}

export default class ProcessGoogleHealthNotificationJob extends Job<GoogleHealthNotification> {
  static options = {
    queue: 'google',
    maxRetries: 3,
    timeout: '30s',
  };

  async execute() {
    const { healthUserId, operation, dataType, intervals } = this.payload;

    const account = await ProviderAccount.findBy('healthUserId', healthUserId);

    if (!account) {
      logger.warn({ healthUserId }, '[Google Webhook] No linked account for healthUserId');
      return;
    }

    if (dataType !== 'steps' || operation !== 'UPSERT') {
      logger.info({ dataType, operation }, '[Google Webhook] Skipping (not a steps upsert)');
      return;
    }

    const range = this.rangeFromIntervals(intervals);

    if (!range) {
      logger.info({ accountId: account.id }, '[Google Webhook] Notification had no intervals');
      return;
    }

    const steps = await new GoogleHealthService().getDailySteps(account, range);

    // Log-only for now — persisting into activity_steps/daily_steps is the next slice.
    logger.info(
      {
        accountId: account.id,
        range: { start: range.start.toISODate(), end: range.end.toISODate() },
        steps,
      },
      '[Google Webhook] Fetched steps for changed range',
    );
  }

  /**
   * Collapse the notification's physical-time intervals into a civil-date range
   * (inclusive start / exclusive end) covering every changed day.
   */
  private rangeFromIntervals(intervals: GoogleHealthNotification['intervals']) {
    if (!intervals || intervals.length === 0) {
      return null;
    }

    let earliest: DateTime | null = null;
    let latest: DateTime | null = null;

    for (const { physicalTimeInterval } of intervals) {
      const start = DateTime.fromISO(physicalTimeInterval.startTime);
      const end = DateTime.fromISO(physicalTimeInterval.endTime);

      if (!start.isValid || !end.isValid) {
        continue;
      }

      if (!earliest || start < earliest) {
        earliest = start;
      }

      if (!latest || end > latest) {
        latest = end;
      }
    }

    if (!earliest || !latest) {
      return null;
    }

    return {
      start: earliest.startOf('day'),
      end: latest.startOf('day').plus({ days: 1 }),
    };
  }

  async failed(error: Error) {
    logger.error(
      {
        err: error,
        healthUserId: this.payload.healthUserId,
        jobId: this.context.jobId,
        attempt: this.context.attempt,
      },
      '[ProcessGoogleHealthNotificationJob] Job failed permanently',
    );
  }
}
