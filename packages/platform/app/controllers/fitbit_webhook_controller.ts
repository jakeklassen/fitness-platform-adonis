import WebhookJob from '#models/webhook_job';
import env from '#start/env';
import type { HttpContext } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger';

interface FitbitWebhookNotification {
  collectionType: string;
  date: string;
  ownerId: string;
  ownerType: string;
  subscriptionId: string;
}

export default class FitbitWebhookController {
  /**
   * Handle webhook verification from FitBit
   * FitBit sends GET requests with a verify parameter
   * Must respond with 204 for correct code, 404 for incorrect code
   */
  async verify({ request, response }: HttpContext) {
    const verifyCode = request.input('verify');
    const expectedCode = env.get('FITBIT_SUBSCRIBER_VERIFICATION_CODE');

    if (!expectedCode) {
      logger.error('FITBIT_SUBSCRIBER_VERIFICATION_CODE not configured');
      return response.status(500).send('Server configuration error');
    }

    if (verifyCode === expectedCode) {
      logger.info('FitBit webhook verification successful');
      return response.noContent();
    }

    logger.warn('FitBit webhook verification failed - incorrect code');
    return response.notFound();
  }

  /**
   * Handle webhook notifications from FitBit
   * Must respond with 204 within 5 seconds
   * Queue the actual processing to avoid timeout
   */
  async handleNotification({ request, response }: HttpContext) {
    try {
      // FitBit sends notifications as a JSON array directly in the body
      const notifications = request.body() as FitbitWebhookNotification[];

      logger.info('Received FitBit webhook payload:', notifications);

      if (!notifications || !Array.isArray(notifications)) {
        logger.warn('Invalid webhook payload received - not an array');
        logger.warn('Raw payload:', request.body());
        return response.badRequest({ error: 'Invalid payload' });
      }

      logger.info(`Received ${notifications.length} FitBit webhook notification(s)`);

      // Queue each notification for async processing
      for (const notification of notifications) {
        await WebhookJob.create({
          jobType: 'fitbit_notification',
          payload: notification,
          status: 'pending',
          retries: 0,
        });

        logger.info('Queued FitBit notification:', {
          collectionType: notification.collectionType,
          date: notification.date,
          ownerId: notification.ownerId,
          subscriptionId: notification.subscriptionId,
        });
      }

      // Must respond with 204 within 5 seconds
      return response.noContent();
    } catch (error) {
      logger.error('Error handling FitBit webhook notification:', error);
      // Still respond with 204 to avoid being marked as failed
      return response.noContent();
    }
  }
}
