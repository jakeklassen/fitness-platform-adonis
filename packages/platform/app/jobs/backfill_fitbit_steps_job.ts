import { StepsBackfillService } from '#services/steps_backfill_service';
import { Job } from '@adonisjs/queue';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';

interface BackfillFitbitStepsPayload {
  userId: number;
}

/**
 * Backfills step data when a FitBit account is first linked.
 *
 * Fetches the last 30 days of daily step data from the FitBit API so the
 * user's dashboard isn't empty while waiting for webhook-driven updates.
 */
export default class BackfillFitbitStepsJob extends Job<BackfillFitbitStepsPayload> {
  static options = {
    queue: 'fitbit',
    maxRetries: 2,
    timeout: '120s',
  };

  async execute() {
    const { userId } = this.payload;

    logger.info(`[BackfillFitbitStepsJob] Starting 30-day backfill for user ${userId}`);

    const endDate = DateTime.now();
    const startDate = endDate.minus({ days: 30 });

    const backfillService = new StepsBackfillService();

    await backfillService.backfillSteps(userId, startDate, endDate);

    logger.info(`[BackfillFitbitStepsJob] Completed backfill for user ${userId}`);
  }

  async failed(error: Error) {
    logger.error(
      {
        err: error,
        userId: this.payload.userId,
        jobId: this.context.jobId,
        attempt: this.context.attempt,
      },
      '[BackfillFitbitStepsJob] Job failed permanently',
    );
  }
}
