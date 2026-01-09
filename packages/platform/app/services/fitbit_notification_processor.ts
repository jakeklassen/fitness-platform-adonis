import ActivityStep from '#models/activity_step';
import ProviderAccount from '#models/provider_account';
import { FitbitService } from '#services/fitbit_service';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';

interface FitbitWebhookNotification {
  collectionType: string;
  date: string;
  ownerId: string;
  ownerType: string;
  subscriptionId: string;
}

export class FitbitNotificationProcessor {
  private fitbitService: FitbitService;
  private aggregationService: StepsAggregationService;

  constructor() {
    this.fitbitService = new FitbitService();
    this.aggregationService = new StepsAggregationService();
  }

  /**
   * Process a FitBit webhook notification
   * Fetches the actual data from FitBit API and stores it
   */
  async processNotification(notification: FitbitWebhookNotification): Promise<boolean> {
    const { collectionType, date, ownerId } = notification;

    logger.info(`Processing FitBit notification: ${collectionType} for user ${ownerId} on ${date}`);

    try {
      // Find the provider account by FitBit user ID (ownerId)
      const account = await ProviderAccount.query()
        .where('provider_user_id', ownerId)
        .whereHas('provider', (query) => {
          query.where('name', 'fitbit');
        })
        .preload('user')
        .first();

      if (!account) {
        logger.warn(`No account found for FitBit user ${ownerId}`);
        return false;
      }

      // Only process activity data for now
      if (collectionType !== 'activities') {
        logger.info(`Skipping ${collectionType} collection type`);
        return true;
      }

      // Fetch steps data for the specific date
      const stepsData = await this.fitbitService.getActivityTimeSeries(
        account,
        'steps',
        date,
        date,
      );

      if (!stepsData || stepsData.length === 0) {
        logger.warn(`No steps data returned from FitBit for ${date}`);
        return false;
      }

      const now = DateTime.now();

      // Store the daily aggregate
      for (const dayData of stepsData) {
        await ActivityStep.updateOrCreate(
          {
            providerAccountId: account.id,
            date: DateTime.fromISO(dayData.dateTime),
            time: null, // Daily aggregate
            granularity: 'daily',
          },
          {
            steps: Number.parseInt(dayData.value, 10),
            syncedAt: now,
          },
        );

        logger.info(
          `Stored ${dayData.value} steps for account ${account.id} on ${dayData.dateTime}`,
        );
      }

      // Run aggregation to update daily_steps table
      await this.aggregationService.aggregateDailySteps(account.userId, date);

      logger.info(`Successfully processed notification for ${ownerId} on ${date}`);

      return true;
    } catch (error) {
      logger.error('Error processing FitBit notification:', error);
      return false;
    }
  }

  /**
   * Process multiple notifications in batch
   */
  async processNotifications(notifications: FitbitWebhookNotification[]): Promise<void> {
    logger.info(`Processing ${notifications.length} FitBit notifications`);

    for (const notification of notifications) {
      await this.processNotification(notification);
    }
  }
}
