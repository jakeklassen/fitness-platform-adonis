import FitbitSubscription from '#models/fitbit_subscription';
import ProviderAccount from '#models/provider_account';
import WebhookJob from '#models/webhook_job';
import { FitbitNotificationProcessor } from '#services/fitbit_notification_processor';
import { BaseCommand } from '@adonisjs/core/ace';
import logger from '@adonisjs/core/services/logger';
import { CommandOptions } from '@adonisjs/core/types/ace';
import vine, { errors as vineErrors } from '@vinejs/vine';
import { schedule } from 'adonisjs-scheduler';
import { DateTime } from 'luxon';

/**
 * FitBit webhook notification payload schema
 * Based on: https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/
 */
const fitbitNotificationSchema = vine.compile(
  vine.object({
    collectionType: vine.enum([
      'activities',
      'body',
      'foods',
      'sleep',
      'userRevokedAccess',
      'deleteUser',
    ]),
    date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ownerId: vine.string().trim().minLength(1),
    ownerType: vine.string().trim(),
    subscriptionId: vine.string().trim().minLength(1),
  }),
);

/**
 * Error types to help determine if a job should be retried
 */
enum ErrorType {
  VALIDATION = 'validation', // Bad payload - don't retry
  NOT_FOUND = 'not_found', // Account not found - don't retry
  API_ERROR = 'api_error', // FitBit API error - retry
  TOKEN_ERROR = 'token_error', // Token refresh failed - retry
  UNKNOWN = 'unknown', // Unknown error - retry
}

@schedule((s) => s.everyMinute().withoutOverlapping())
export default class ProcessWebhookQueue extends BaseCommand {
  static commandName = 'process:webhook:queue';
  static description = 'Process pending webhook jobs from the queue';

  static options: CommandOptions = {
    startApp: true,
  };

  private processor = new FitbitNotificationProcessor();
  private maxRetries = 3;
  private batchSize = 10;

  async run() {
    const startTime = DateTime.now();
    logger.info('[Webhook Queue] Starting batch processing');

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    // Process up to batchSize jobs
    for (let i = 0; i < this.batchSize; i++) {
      const result = await this.processNextJob();

      if (!result) {
        break; // No more jobs
      }

      processed++;
      if (result.success) {
        succeeded++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
      }
    }

    const duration = DateTime.now().diff(startTime, 'seconds').seconds;

    if (processed > 0) {
      logger.info(
        `[Webhook Queue] Completed batch: ${processed} processed (${succeeded} succeeded, ${failed} failed, ${skipped} skipped) in ${duration.toFixed(2)}s`,
      );
    } else {
      logger.debug('[Webhook Queue] No pending jobs to process');
    }
  }

  private async processNextJob(): Promise<{
    success: boolean;
    skipped: boolean;
  } | null> {
    // Get the oldest pending job with exponential backoff consideration
    const job = await WebhookJob.query()
      .where('status', 'pending')
      .where((query) => {
        // Apply exponential backoff: wait longer after each retry
        query.where('retries', 0).orWhere((subQuery) => {
          const now = DateTime.now();
          // Retry 1: wait 1 min, Retry 2: wait 5 min, Retry 3: wait 15 min
          subQuery
            .where('retries', 1)
            .where('updated_at', '<', now.minus({ minutes: 1 }).toSQL())
            .orWhere((retry2) => {
              retry2
                .where('retries', 2)
                .where('updated_at', '<', now.minus({ minutes: 5 }).toSQL());
            })
            .orWhere((retry3) => {
              retry3
                .where('retries', '>=', 3)
                .where('updated_at', '<', now.minus({ minutes: 15 }).toSQL());
            });
        });
      })
      .orderBy('created_at', 'asc')
      .first();

    if (!job) {
      return null; // No jobs to process
    }

    const jobContext = {
      id: job.id,
      type: job.jobType,
      attempt: job.retries + 1,
      maxRetries: this.maxRetries,
    };

    logger.info(`[Job ${job.id}] Processing (attempt ${jobContext.attempt}/${this.maxRetries})`);
    job.status = 'processing';
    await job.save();

    try {
      // Validate payload structure
      let validatedPayload;
      try {
        validatedPayload = await fitbitNotificationSchema.validate(job.payload);
      } catch (error) {
        if (error instanceof vineErrors.E_VALIDATION_ERROR) {
          logger.error(`[Job ${job.id}] Invalid payload:`, {
            errors: error.messages,
            payload: job.payload,
          });
          await this.handleFailure(job, ErrorType.VALIDATION, 'Invalid payload schema');
          return { success: false, skipped: false };
        }
        throw error;
      }

      logger.info(`[Job ${job.id}] Validated notification:`, {
        collectionType: validatedPayload.collectionType,
        date: validatedPayload.date,
        ownerId: validatedPayload.ownerId,
        subscriptionId: validatedPayload.subscriptionId,
      });

      // Handle special collection types
      if (validatedPayload.collectionType === 'userRevokedAccess') {
        await this.handleUserRevokedAccess(job, validatedPayload);
        return { success: true, skipped: false };
      }

      if (validatedPayload.collectionType === 'deleteUser') {
        await this.handleDeleteUser(job, validatedPayload);
        return { success: true, skipped: false };
      }

      // Process based on job type
      let success = false;
      switch (job.jobType) {
        case 'fitbit_notification':
          success = await this.processor.processNotification(validatedPayload);
          break;
        default:
          logger.warn(`[Job ${job.id}] Unknown job type: ${job.jobType}`);
          await this.handleFailure(job, ErrorType.VALIDATION, `Unknown job type: ${job.jobType}`);
          return { success: false, skipped: false };
      }

      if (success) {
        job.status = 'completed';
        job.processedAt = DateTime.now();
        job.error = null;
        await job.save();

        logger.info(`[Job ${job.id}] Completed successfully`);
        return { success: true, skipped: false };
      } else {
        // Processor returned false - could be account not found, skipped collection type, etc.
        await this.handleFailure(job, ErrorType.NOT_FOUND, 'Processing returned false');
        return { success: false, skipped: false };
      }
    } catch (error) {
      logger.error(`[Job ${job.id}] Error processing:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        payload: job.payload,
      });

      // Categorize error type
      const errorType = this.categorizeError(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.handleFailure(job, errorType, errorMessage);
      return { success: false, skipped: false };
    }
  }

  /**
   * Handle user revoking OAuth access
   * User went to FitBit settings and revoked access to our app
   */
  private async handleUserRevokedAccess(
    job: WebhookJob,
    payload: { ownerId: string; date: string },
  ): Promise<void> {
    logger.warn(`[Job ${job.id}] User revoked access: ${payload.ownerId} on ${payload.date}`);

    // Find the provider account by FitBit user ID
    const account = await ProviderAccount.query()
      .where('provider_user_id', payload.ownerId)
      .whereHas('provider', (query) => {
        query.where('name', 'fitbit');
      })
      .first();

    if (!account) {
      logger.warn(
        `[Job ${job.id}] No account found for FitBit user ${payload.ownerId} - may already be deleted`,
      );
      job.status = 'completed';
      job.processedAt = DateTime.now();
      await job.save();
      return;
    }

    logger.info(`[Job ${job.id}] Found account ${account.id} for user ${account.userId}`);

    // Clear tokens to prevent future API calls with invalid credentials
    account.accessToken = null;
    account.refreshToken = null;
    account.expiresAt = null;
    await account.save();

    logger.info(`[Job ${job.id}] Cleared tokens for account ${account.id}`);

    // Mark all subscriptions as inactive
    const updatedCount = await FitbitSubscription.query()
      .where('provider_account_id', account.id)
      .where('is_active', true)
      .update({ is_active: false });

    logger.info(
      `[Job ${job.id}] Marked ${updatedCount} subscription(s) as inactive for account ${account.id}`,
    );

    // Keep all activity data - user might reconnect later
    logger.info(
      `[Job ${job.id}] Revocation handled: tokens cleared, subscriptions inactive, data preserved`,
    );

    job.status = 'completed';
    job.processedAt = DateTime.now();
    await job.save();
  }

  /**
   * Handle user deleting their FitBit account
   * FitBit notifies us when a user completely deletes their account
   */
  private async handleDeleteUser(
    job: WebhookJob,
    payload: { ownerId: string; date: string },
  ): Promise<void> {
    logger.warn(
      `[Job ${job.id}] User deleted FitBit account: ${payload.ownerId} on ${payload.date}`,
    );

    // Find the provider account by FitBit user ID
    const account = await ProviderAccount.query()
      .where('provider_user_id', payload.ownerId)
      .whereHas('provider', (query) => {
        query.where('name', 'fitbit');
      })
      .first();

    if (!account) {
      logger.warn(
        `[Job ${job.id}] No account found for FitBit user ${payload.ownerId} - may already be deleted`,
      );
      job.status = 'completed';
      job.processedAt = DateTime.now();
      await job.save();
      return;
    }

    logger.info(`[Job ${job.id}] Found account ${account.id} for user ${account.userId}`);

    // Clear tokens to prevent future API calls
    account.accessToken = null;
    account.refreshToken = null;
    account.expiresAt = null;
    await account.save();

    logger.info(`[Job ${job.id}] Cleared tokens for account ${account.id}`);

    // Mark all subscriptions as inactive
    const updatedCount = await FitbitSubscription.query()
      .where('provider_account_id', account.id)
      .where('is_active', true)
      .update({ is_active: false });

    logger.info(
      `[Job ${job.id}] Marked ${updatedCount} subscription(s) as inactive for account ${account.id}`,
    );

    // TODO: Data deletion strategy pending competition data retention policy
    // For now: Keep all data (activity_steps, daily_steps) until retention policy is defined
    // User's account with us remains active - they can reconnect or add a different provider
    logger.warn(
      `[Job ${job.id}] FitBit account deletion handled: API access disabled, data preserved pending retention policy`,
    );

    job.status = 'completed';
    job.processedAt = DateTime.now();
    await job.save();
  }

  /**
   * Categorize errors to determine retry behavior
   */
  private categorizeError(error: unknown): ErrorType {
    if (!(error instanceof Error)) {
      return ErrorType.UNKNOWN;
    }

    const message = error.message.toLowerCase();

    // Validation errors - don't retry
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return ErrorType.VALIDATION;
    }

    // Token/auth errors - retry (might be temporary)
    if (
      message.includes('token') ||
      message.includes('unauthorized') ||
      message.includes('authentication')
    ) {
      return ErrorType.TOKEN_ERROR;
    }

    // Not found errors - don't retry
    if (message.includes('not found') || message.includes('no account')) {
      return ErrorType.NOT_FOUND;
    }

    // API errors - retry (might be rate limiting or temporary outage)
    if (
      message.includes('api error') ||
      message.includes('rate limit') ||
      message.includes('timeout')
    ) {
      return ErrorType.API_ERROR;
    }

    // Default to unknown (retry)
    return ErrorType.UNKNOWN;
  }

  /**
   * Handle job failure with smart retry logic based on error type
   */
  private async handleFailure(
    job: WebhookJob,
    errorType: ErrorType,
    errorMessage: string,
  ): Promise<void> {
    // Non-retryable errors - fail immediately
    const nonRetryableErrors = [ErrorType.VALIDATION, ErrorType.NOT_FOUND];
    const shouldRetry = !nonRetryableErrors.includes(errorType);

    job.error = `[${errorType}] ${errorMessage}`;

    if (!shouldRetry) {
      // Don't retry - mark as failed immediately
      job.status = 'failed';
      job.processedAt = DateTime.now();
      logger.error(
        `[Job ${job.id}] Failed permanently (non-retryable ${errorType}): ${errorMessage}`,
      );
    } else {
      // Retryable error
      job.retries += 1;

      if (job.retries >= this.maxRetries) {
        job.status = 'failed';
        job.processedAt = DateTime.now();
        logger.error(
          `[Job ${job.id}] Failed permanently after ${job.retries} retries (${errorType}): ${errorMessage}`,
        );
      } else {
        job.status = 'pending'; // Retry with exponential backoff
        const retryDelays = [1, 5, 15]; // minutes
        const delayMinutes = retryDelays[job.retries - 1] || 15;
        logger.warn(
          `[Job ${job.id}] Failed (attempt ${job.retries}/${this.maxRetries}, ${errorType}). Retry in ${delayMinutes}min: ${errorMessage}`,
        );
      }
    }

    await job.save();
  }
}
