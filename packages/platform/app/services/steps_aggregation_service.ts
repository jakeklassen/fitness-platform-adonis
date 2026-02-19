import ActivityStep from '#models/activity_step';
import DailyStep from '#models/daily_step';
import User from '#models/user';
import { DateTime } from 'luxon';

interface IntradayReading {
  time: string;
  steps: number;
  provider: string;
  providerAccountId: number;
}

export class StepsAggregationService {
  /**
   * Aggregate steps for a specific user and date
   * Intelligently handles both daily and intraday data
   */
  async aggregateDailySteps(userId: number, date: string): Promise<void> {
    const dateObj = DateTime.fromISO(date);

    // Check if we have ANY intraday data for this date
    const hasIntradayData = await ActivityStep.query()
      .whereHas('providerAccount', (accountQuery) => {
        accountQuery.where('user_id', userId);
      })
      .where('date', date)
      .where('granularity', 'intraday')
      .first();

    let totalSteps: number;
    let primaryProviderAccountId: number | null = null;

    if (hasIntradayData) {
      // Use intelligent merging of intraday data
      const merged = await this.mergeIntradaySteps(userId, date);
      totalSteps = merged.reduce((sum, reading) => sum + reading.steps, 0);

      // Use the most recent sync as primary
      if (merged.length > 0) {
        primaryProviderAccountId = merged[merged.length - 1].providerAccountId;
      }
    } else {
      // Fall back to daily aggregation
      const dailyReadings = await ActivityStep.query()
        .whereHas('providerAccount', (accountQuery) => {
          accountQuery.where('user_id', userId);
        })
        .where('date', date)
        .where('granularity', 'daily')
        .preload('providerAccount', (query) => {
          query.preload('provider');
        });

      if (dailyReadings.length === 0) {
        return;
      }

      // Apply priority to pick one daily reading
      const selected = await this.resolveConflict(dailyReadings, userId);
      totalSteps = selected.steps;
      primaryProviderAccountId = selected.providerAccountId;
    }

    // Upsert into daily_steps table
    // Lucid's updateOrCreate is not atomic (SELECT then INSERT), so concurrent
    // jobs processing the same user+date can hit a unique constraint race condition.
    try {
      await DailyStep.updateOrCreate(
        { userId, date: dateObj },
        { steps: totalSteps, primaryProviderAccountId },
      );
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        await DailyStep.query()
          .where('user_id', userId)
          .where('date', dateObj.toISODate()!)
          .update({
            steps: totalSteps,
            primaryProviderAccountId,
            updatedAt: DateTime.now(),
          });
      } else {
        throw error;
      }
    }
  }

  /**
   * Merge intraday steps from multiple providers
   * Only applies priority when there's temporal overlap
   */
  private async mergeIntradaySteps(userId: number, date: string): Promise<IntradayReading[]> {
    // Get all readings for this user for this date
    const allReadings = await ActivityStep.query()
      .whereHas('providerAccount', (accountQuery) => {
        accountQuery.where('user_id', userId);
      })
      .where('date', date)
      .where('granularity', 'intraday')
      .preload('providerAccount', (query) => {
        query.preload('provider');
      })
      .orderBy('time', 'asc');

    // Group by time slot
    const timeSlots = new Map<string, ActivityStep[]>();

    for (const reading of allReadings) {
      const timeKey = reading.time || '00:00:00';
      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, []);
      }
      timeSlots.get(timeKey)!.push(reading);
    }

    // Resolve conflicts per time slot
    const mergedReadings: IntradayReading[] = [];

    for (const [time, readings] of timeSlots) {
      if (readings.length === 1) {
        // No conflict - use the only reading available
        mergedReadings.push({
          time,
          steps: readings[0].steps,
          provider: readings[0].providerAccount.provider.name,
          providerAccountId: readings[0].providerAccountId,
        });
      } else {
        // Conflict - apply priority strategy
        const selected = await this.resolveConflict(readings, userId);
        mergedReadings.push({
          time,
          steps: selected.steps,
          provider: selected.providerAccount.provider.name,
          providerAccountId: selected.providerAccountId,
        });
      }
    }

    return mergedReadings;
  }

  /**
   * Resolve conflicts when multiple providers have data for the same time
   * Priority order:
   * 1. User's preferred provider (if set)
   * 2. Most recent sync
   * 3. First in list (deterministic fallback)
   */
  private async resolveConflict(readings: ActivityStep[], userId: number): Promise<ActivityStep> {
    if (readings.length === 1) {
      return readings[0];
    }

    // Strategy 1: User's preferred provider
    const user = await User.query().where('id', userId).preload('preferredStepsProvider').first();
    const preferredProviderName = user?.preferredStepsProvider?.name;

    if (preferredProviderName) {
      const preferred = readings.find(
        (r) => r.providerAccount.provider.name === preferredProviderName,
      );
      if (preferred) {
        return preferred;
      }
    }

    // Strategy 2: Most recent sync
    const mostRecent = readings.reduce((prev, curr) =>
      curr.syncedAt > prev.syncedAt ? curr : prev,
    );

    return mostRecent;
  }

  /**
   * Aggregate steps for multiple dates at once
   * Useful for batch processing
   */
  async aggregateMultipleDates(userId: number, dates: string[]): Promise<void> {
    for (const date of dates) {
      await this.aggregateDailySteps(userId, date);
    }
  }

  /**
   * Aggregate steps for all users for a specific date
   * Useful for scheduled jobs that run daily
   */
  async aggregateAllUsersForDate(date: string): Promise<void> {
    // Get all user IDs that have activity data for this date
    const userIds = await ActivityStep.query()
      .where('date', date)
      .preload('providerAccount', (query) => {
        query.preload('provider');
      })
      .then((steps) => {
        const uniqueUserIds = new Set<number>();
        steps.forEach((step) => {
          if (step.providerAccount.userId) {
            uniqueUserIds.add(step.providerAccount.userId);
          }
        });
        return Array.from(uniqueUserIds);
      });

    // Aggregate for each user
    for (const userId of userIds) {
      await this.aggregateDailySteps(userId, date);
    }
  }
}
