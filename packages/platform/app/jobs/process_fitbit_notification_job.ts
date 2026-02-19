import {
  FitbitNotificationProcessor,
  type FitbitWebhookNotification,
} from '#services/fitbit_notification_processor';
import { Job } from '@adonisjs/queue';
import logger from '@adonisjs/core/services/logger';

export default class ProcessFitbitNotificationJob extends Job<FitbitWebhookNotification> {
  static options = {
    queue: 'fitbit',
    maxRetries: 3,
    timeout: '30s',
  };

  async execute() {
    const { collectionType, ownerId } = this.payload;

    logger.info(
      `[ProcessFitbitNotificationJob] Processing ${collectionType} for ${ownerId} (attempt ${this.context.attempt})`,
    );

    const processor = new FitbitNotificationProcessor();

    if (collectionType === 'userRevokedAccess') {
      await processor.handleUserRevokedAccess(ownerId);
      return;
    }

    if (collectionType === 'deleteUser') {
      await processor.handleDeleteUser(ownerId);
      return;
    }

    await processor.processNotification(this.payload);
  }

  async failed(error: Error) {
    logger.error(
      {
        err: error,
        collectionType: this.payload.collectionType,
        ownerId: this.payload.ownerId,
        date: this.payload.date,
        jobId: this.context.jobId,
        attempt: this.context.attempt,
      },
      '[ProcessFitbitNotificationJob] Job failed permanently',
    );
  }
}
