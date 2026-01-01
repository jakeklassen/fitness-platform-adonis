import ActivityStep from '#models/activity_step';
import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import { FitbitService } from '#services/fitbit_service';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';

export class StepsBackfillService {
  /**
   * Backfill steps data for a user within a date range
   * Only fetches dates that don't already exist in the database
   */
  async backfillSteps(userId: number, startDate: DateTime, endDate: DateTime): Promise<void> {
    try {
      // Get the Fitbit provider
      const fitbitProvider = await Provider.findByOrFail('name', 'fitbit');

      // Get user's Fitbit account
      const account = await ProviderAccount.query()
        .where('user_id', userId)
        .where('provider_id', fitbitProvider.id)
        .first();

      if (!account) {
        logger.warn(`No Fitbit account found for user ${userId}`);
        return;
      }

      logger.info(
        `Starting backfill for user ${userId} from ${startDate.toISODate()} to ${endDate.toISODate()}`,
      );

      // Get existing dates we already have data for
      const existingDates = await this.getExistingDataDates(account.id, startDate, endDate);

      // Calculate missing dates
      const missingDates = this.getMissingDates(startDate, endDate, existingDates);

      if (missingDates.length === 0) {
        logger.info(`No missing dates for user ${userId}, backfill not needed`);
        return;
      }

      logger.info(`Found ${missingDates.length} missing dates for user ${userId}`);

      // Fetch from Fitbit in chunks to respect rate limits
      // Fitbit allows fetching up to 1 year of data at once
      // But we'll chunk it to 30 days at a time to be safe
      const chunks = this.chunkDates(missingDates, 30);

      const fitbitService = new FitbitService();
      const aggregationService = new StepsAggregationService();
      const fetchedDates: string[] = [];

      for (const chunk of chunks) {
        try {
          const dates = await this.fetchAndStoreChunk(fitbitService, account, chunk);
          fetchedDates.push(...dates);

          // Small delay to respect rate limits (1 second between chunks)
          await this.delay(1000);
        } catch (error) {
          logger.error(`Failed to fetch chunk for user ${userId}:`, error);
          // Continue with next chunk even if one fails
        }
      }

      // Aggregate all fetched ActivitySteps into DailySteps
      if (fetchedDates.length > 0) {
        logger.info(`Aggregating ${fetchedDates.length} dates for user ${userId}`);
        try {
          await aggregationService.aggregateMultipleDates(userId, fetchedDates);
          logger.info(`Completed aggregation for user ${userId}`);
        } catch (error) {
          logger.error(`Failed to aggregate data for user ${userId}:`, error);
          // Don't throw - backfill succeeded even if aggregation failed
        }
      }

      logger.info(`Completed backfill for user ${userId}`);
    } catch (error) {
      logger.error(`Backfill failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all dates we already have daily step data for
   */
  private async getExistingDataDates(
    accountId: number,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<Set<string>> {
    const existingRecords = await ActivityStep.query()
      .where('account_id', accountId)
      .where('granularity', 'daily')
      .whereBetween('date', [startDate.toSQLDate()!, endDate.toSQLDate()!])
      .select('date');

    // Convert DateTime objects to ISO date strings
    return new Set(existingRecords.map((r) => r.date.toISODate()!));
  }

  /**
   * Calculate which dates are missing from our database
   */
  private getMissingDates(
    startDate: DateTime,
    endDate: DateTime,
    existingDates: Set<string>,
  ): DateTime[] {
    const missing: DateTime[] = [];
    let current = startDate.startOf('day');
    const end = endDate.startOf('day');
    const today = DateTime.now().startOf('day');

    while (current <= end && current <= today) {
      const dateStr = current.toISODate()!;
      if (!existingDates.has(dateStr)) {
        missing.push(current);
      }
      current = current.plus({ days: 1 });
    }

    return missing;
  }

  /**
   * Split dates into chunks for batch processing
   */
  private chunkDates(dates: DateTime[], chunkSize: number): DateTime[][] {
    const chunks: DateTime[][] = [];
    for (let i = 0; i < dates.length; i += chunkSize) {
      chunks.push(dates.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Fetch a chunk of dates from Fitbit and store in database
   * Returns the list of dates that were successfully fetched
   */
  private async fetchAndStoreChunk(
    fitbitService: FitbitService,
    account: ProviderAccount,
    dates: DateTime[],
  ): Promise<string[]> {
    if (dates.length === 0) return [];

    const startDate = dates[0].toISODate()!;
    const endDate = dates[dates.length - 1].toISODate()!;

    logger.debug(`Fetching steps data from ${startDate} to ${endDate} for account ${account.id}`);

    try {
      // Fetch activity time series from Fitbit
      const stepsData = await fitbitService.getActivityTimeSeries(
        account,
        'steps',
        startDate,
        endDate,
      );

      logger.debug(`Received ${stepsData.length} days of data from Fitbit`);

      // Store each day's data and track dates
      const now = DateTime.now();
      const fetchedDates: string[] = [];

      for (const dayData of stepsData) {
        await ActivityStep.updateOrCreate(
          {
            accountId: account.id,
            date: DateTime.fromISO(dayData.dateTime),
            time: null, // Daily aggregate, no specific time
            granularity: 'daily',
          },
          {
            steps: Number.parseInt(dayData.value, 10),
            syncedAt: now,
          },
        );
        fetchedDates.push(dayData.dateTime);
      }

      logger.debug(`Stored ${stepsData.length} days of data for account ${account.id}`);
      return fetchedDates;
    } catch (error) {
      logger.error(`Failed to fetch/store chunk ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a user needs backfilling for a specific date range
   */
  async needsBackfill(userId: number, startDate: DateTime, endDate: DateTime): Promise<boolean> {
    // Get the Fitbit provider
    const fitbitProvider = await Provider.findByOrFail('name', 'fitbit');

    const account = await ProviderAccount.query()
      .where('user_id', userId)
      .where('provider_id', fitbitProvider.id)
      .first();

    if (!account) {
      return false; // Can't backfill without an account
    }

    const existingDates = await this.getExistingDataDates(account.id, startDate, endDate);
    const missingDates = this.getMissingDates(startDate, endDate, existingDates);

    return missingDates.length > 0;
  }
}
