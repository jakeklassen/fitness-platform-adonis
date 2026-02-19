import ActivityStep from '#models/activity_step';
import FitbitSubscription from '#models/fitbit_subscription';
import ProviderAccount from '#models/provider_account';
import { FitbitService } from '#services/fitbit_service';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';

export interface FitbitWebhookNotification {
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
   * Process a FitBit webhook notification.
   * Fetches the actual data from the FitBit API and stores it.
   */
  async processNotification(notification: FitbitWebhookNotification): Promise<boolean> {
    const { collectionType, date, ownerId } = notification;

    logger.info(`Processing FitBit notification: ${collectionType} for user ${ownerId} on ${date}`);

    try {
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

      if (collectionType !== 'activities') {
        logger.info(`Skipping ${collectionType} collection type`);
        return true;
      }

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

      for (const dayData of stepsData) {
        await ActivityStep.updateOrCreate(
          {
            providerAccountId: account.id,
            date: DateTime.fromISO(dayData.dateTime),
            time: null,
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

      await this.aggregationService.aggregateDailySteps(account.userId, date);

      logger.info(`Successfully processed notification for ${ownerId} on ${date}`);

      return true;
    } catch (error) {
      logger.error({ err: error }, 'Error processing FitBit notification');
      return false;
    }
  }

  /**
   * Handle a userRevokedAccess notification.
   * Clears tokens and deactivates subscriptions but preserves historical data.
   */
  async handleUserRevokedAccess(ownerId: string): Promise<boolean> {
    try {
      const account = await ProviderAccount.query()
        .where('provider_user_id', ownerId)
        .whereHas('provider', (query) => {
          query.where('name', 'fitbit');
        })
        .first();

      if (!account) {
        logger.warn(`No account found for revoked FitBit user ${ownerId}`);
        return false;
      }

      account.accessToken = null;
      account.refreshToken = null;
      account.expiresAt = null;
      await account.save();

      await FitbitSubscription.query()
        .where('provider_account_id', account.id)
        .where('is_active', true)
        .update({ isActive: false });

      logger.info(`Handled userRevokedAccess for FitBit user ${ownerId}`);

      return true;
    } catch (error) {
      logger.error('Error handling userRevokedAccess:', error);
      return false;
    }
  }

  /**
   * Handle a deleteUser notification.
   * Same treatment as revokedAccess — clears tokens, deactivates subscriptions,
   * preserves historical data.
   */
  async handleDeleteUser(ownerId: string): Promise<boolean> {
    return this.handleUserRevokedAccess(ownerId);
  }
}
