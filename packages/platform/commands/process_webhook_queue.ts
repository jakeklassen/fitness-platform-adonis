import WebhookJob from '#models/webhook_job';
import { FitbitNotificationProcessor } from '#services/fitbit_notification_processor';
import { BaseCommand } from '@adonisjs/core/ace';
import logger from '@adonisjs/core/services/logger';
import { CommandOptions } from '@adonisjs/core/types/ace';
import { DateTime } from 'luxon';

export default class ProcessWebhookQueue extends BaseCommand {
  static commandName = 'process:webhook:queue';
  static description = 'Process pending webhook jobs from the queue';

  static options: CommandOptions = {
    startApp: true,
  };

  private processor = new FitbitNotificationProcessor();
  private maxRetries = 3;
  private running = true;

  async run() {
    logger.info('Webhook queue worker started');

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    while (this.running) {
      try {
        await this.processNextJob();
        // Wait 1 second between checks
        await this.sleep(1000);
      } catch (error) {
        logger.error('Error in queue worker loop:');
        logger.error(error);
        if (error instanceof Error) {
          logger.error('Error message:', error.message);
          logger.error('Stack trace:', error.stack);
        }
        await this.sleep(5000); // Wait longer on errors
      }
    }

    logger.info('Webhook queue worker stopped');
  }

  private async processNextJob(): Promise<void> {
    // Get the oldest pending job
    const job = await WebhookJob.query()
      .where('status', 'pending')
      .orderBy('created_at', 'asc')
      .first();

    if (!job) {
      return;
    }

    logger.info(`Processing job ${job.id} (${job.jobType})`);
    job.status = 'processing';
    await job.save();

    try {
      let success = false;

      // Process based on job type
      switch (job.jobType) {
        case 'fitbit_notification':
          success = await this.processor.processNotification(job.payload);
          break;
        default:
          logger.warn(`Unknown job type: ${job.jobType}`);
          success = false;
      }

      if (success) {
        job.status = 'completed';
        job.processedAt = DateTime.now();
        job.error = null;
        await job.save();
        logger.info(`Job ${job.id} completed successfully`);
      } else {
        await this.handleFailure(job, 'Processing returned false');
      }
    } catch (error) {
      logger.error('Error processing job:', error);
      if (error instanceof Error) {
        logger.error('Stack:', error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleFailure(job, errorMessage);
    }
  }

  private async handleFailure(job: WebhookJob, errorMessage: string): Promise<void> {
    job.retries += 1;
    job.error = errorMessage;

    if (job.retries >= this.maxRetries) {
      job.status = 'failed';
      job.processedAt = DateTime.now();
      logger.error(
        `Job ${job.id} failed permanently after ${job.retries} retries: ${errorMessage}`,
      );
    } else {
      job.status = 'pending'; // Retry
      logger.warn(
        `Job ${job.id} failed (attempt ${job.retries}/${this.maxRetries}): ${errorMessage}`,
      );
    }

    await job.save();
  }

  private shutdown(): void {
    logger.info('Received shutdown signal, stopping worker...');
    this.running = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
