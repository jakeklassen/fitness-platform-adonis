import ActivityStep from '#models/activity_step';
import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import { FitbitTokenRefreshService } from '#services/fitbit_token_refresh_service';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import { Job } from '@adonisjs/queue';
import logger from '@adonisjs/core/services/logger';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

const fitbitStepsResponseSchema = vine.compile(
  vine.object({
    'activities-steps': vine.array(
      vine.object({
        dateTime: vine.string(),
        value: vine.string(),
      }),
    ),
  }),
);

/**
 * Fallback polling sync for FitBit step data.
 *
 * FitBit subscription notifications are NOT guaranteed to be delivered:
 *   - "The subscriptions API does not attempt to send a notification more than once."
 *   - "Occasionally your application may miss subscription notifications due to
 *      outages and connectivity issues."
 *   - "When the user initiates a new session with your application, your application
 *      should fetch the most recent resources to be certain that the best data
 *      is presented."
 *
 * @see https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/
 */
export default class SyncFitbitStepsJob extends Job {
  static options = {
    queue: 'fitbit',
    maxRetries: 2,
    timeout: '120s',
  };

  async execute() {
    logger.info('[SyncFitbitStepsJob] Starting steps sync...');

    const fitbitProvider = await Provider.findBy('name', 'fitbit');

    if (!fitbitProvider) {
      logger.warn('[SyncFitbitStepsJob] No fitbit provider found');
      return;
    }

    const fitbitAccounts = await ProviderAccount.query()
      .where('provider_id', fitbitProvider.id)
      .preload('user');

    logger.info(`[SyncFitbitStepsJob] Found ${fitbitAccounts.length} FitBit accounts to sync`);

    const tokenRefreshService = new FitbitTokenRefreshService();
    const aggregationService = new StepsAggregationService();
    const today = DateTime.now().toISODate();

    let successCount = 0;
    let errorCount = 0;

    for (const account of fitbitAccounts) {
      try {
        const accessToken = await tokenRefreshService.getValidAccessToken(account);

        if (!accessToken) {
          logger.warn(`[SyncFitbitStepsJob] No valid token for account ${account.id}, skipping`);
          errorCount++;
          continue;
        }

        const response = await fetch(
          `https://api.fitbit.com/1/user/-/activities/steps/date/${today}/1d.json`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          logger.error(
            `[SyncFitbitStepsJob] API error for account ${account.id}: ${response.status}`,
          );
          errorCount++;
          continue;
        }

        const rawData = await response.json();
        const data = await fitbitStepsResponseSchema.validate(rawData);
        const stepsData = data['activities-steps'][0];

        if (!stepsData) {
          logger.warn(`[SyncFitbitStepsJob] No steps data returned for account ${account.id}`);
          errorCount++;
          continue;
        }

        await ActivityStep.updateOrCreate(
          {
            providerAccountId: account.id,
            date: DateTime.fromISO(stepsData.dateTime),
            time: null,
            granularity: 'daily',
          },
          {
            steps: Number.parseInt(stepsData.value, 10),
            syncedAt: DateTime.now(),
          },
        );

        logger.info(
          `[SyncFitbitStepsJob] Stored ${stepsData.value} steps for ${stepsData.dateTime}`,
        );

        await aggregationService.aggregateDailySteps(account.userId, stepsData.dateTime);

        successCount++;
      } catch (error) {
        logger.error(
          { err: error, accountId: account.id },
          '[SyncFitbitStepsJob] Error syncing account',
        );
        errorCount++;
      }
    }

    logger.info(`[SyncFitbitStepsJob] Completed: ${successCount} successful, ${errorCount} errors`);
  }

  async failed(error: Error) {
    logger.error(
      {
        err: error,
        jobId: this.context.jobId,
        attempt: this.context.attempt,
      },
      '[SyncFitbitStepsJob] Job failed permanently',
    );
  }
}
