import ActivityStep from '#models/activity_step';
import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import { FitbitTokenRefreshService } from '#services/fitbit_token_refresh_service';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import { BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

// FitBit API response schema
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

export default class SyncFitbitSteps extends BaseCommand {
  static commandName = 'sync:fitbit-steps';
  static description = 'Manually sync steps data from FitBit for all linked accounts';

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    this.logger.info('[FitBit Sync] Starting steps sync...');

    try {
      const fitbitProvider = await Provider.findByOrFail('name', 'fitbit');
      const fitbitAccounts = await ProviderAccount.query()
        .where('provider_id', fitbitProvider.id)
        .preload('user');

      this.logger.info(`[FitBit Sync] Found ${fitbitAccounts.length} FitBit accounts to sync`);

      const tokenRefreshService = new FitbitTokenRefreshService();
      const aggregationService = new StepsAggregationService();

      const today = DateTime.now().toISODate();

      let successCount = 0;
      let errorCount = 0;

      // Sync each account
      for (const account of fitbitAccounts) {
        try {
          this.logger.info(
            `[FitBit Sync] Syncing account ${account.id} for user ${account.user.email}`,
          );

          const accessToken = await tokenRefreshService.getValidAccessToken(account);

          if (!accessToken) {
            this.logger.warning(`[FitBit Sync] No valid token for account ${account.id}, skipping`);
            errorCount++;
            continue;
          }

          // Fetch steps data from FitBit
          const response = await fetch(
            `https://api.fitbit.com/1/user/-/activities/steps/date/${today}/1d.json`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (!response.ok) {
            this.logger.error(
              `[FitBit Sync] API error for account ${account.id}: ${response.status}`,
            );
            errorCount++;
            continue;
          }

          const rawData = await response.json();

          // Validate the response, the sync with the activity_steps table
          const data = await fitbitStepsResponseSchema.validate(rawData);
          const stepsData = data['activities-steps'][0];

          if (!stepsData) {
            this.logger.warning(`[FitBit Sync] No steps data returned for account ${account.id}`);
            errorCount++;
            continue;
          }

          await ActivityStep.updateOrCreate(
            {
              providerAccountId: account.id,
              date: DateTime.fromISO(stepsData.dateTime),
              time: null, // Daily data
            },
            {
              steps: Number.parseInt(stepsData.value),
              granularity: 'daily',
              syncedAt: DateTime.now(),
            },
          );

          this.logger.info(
            `[FitBit Sync] Stored ${stepsData.value} steps for ${stepsData.dateTime}`,
          );

          // Aggregate into daily_steps table
          await aggregationService.aggregateDailySteps(account.userId, stepsData.dateTime);

          successCount++;
        } catch (error) {
          this.logger.error(`[FitBit Sync] Error syncing account ${account.id}: ${error.message}`);
          errorCount++;
        }
      }

      this.logger.info(`[FitBit Sync] Completed: ${successCount} successful, ${errorCount} errors`);
    } catch (error) {
      this.logger.error(`[FitBit Sync] Fatal error: ${error.message}`);
      throw error;
    }
  }
}
