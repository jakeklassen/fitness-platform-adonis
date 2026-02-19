import ProcessFitbitNotificationJob from '#jobs/process_fitbit_notification_job';
import env from '#start/env';
import type { HttpContext } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger';
import vine from '@vinejs/vine';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * FitBit webhook notification schema
 * Based on: https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/
 */
const fitbitWebhookNotificationSchema = vine.compile(
  vine.array(
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
  ),
);

export default class FitbitWebhookController {
  /**
   * Verify X-Fitbit-Signature header using HMAC-SHA1.
   *
   * FitBit uses: BASE64(HMAC-SHA1(body, "client_secret&"))
   * @see https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/
   */
  private verifySignature(body: string, signature: string | undefined): boolean {
    if (!signature) {
      logger.warn('[FitBit Webhook] Missing X-Fitbit-Signature header');
      return false;
    }

    const clientSecret = env.get('FITBIT_CLIENT_SECRET');

    if (!clientSecret) {
      logger.error('[FitBit Webhook] FITBIT_CLIENT_SECRET not configured');
      return false;
    }

    try {
      const signingKey = `${clientSecret}&`;

      const hmac = createHmac('sha1', signingKey);
      hmac.update(body, 'utf8');
      const computedSignature = hmac.digest('base64');

      const expectedBuffer = Buffer.from(signature, 'utf8');
      const computedBuffer = Buffer.from(computedSignature, 'utf8');

      if (expectedBuffer.length !== computedBuffer.length) {
        logger.warn('[FitBit Webhook] Signature length mismatch');
        return false;
      }

      return timingSafeEqual(expectedBuffer, computedBuffer);
    } catch (error) {
      logger.error('[FitBit Webhook] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle webhook verification from FitBit.
   *
   * FitBit sends GET requests with a `verify` parameter.
   * Must respond with 204 for correct code, 404 for incorrect code.
   */
  async verify({ request, response }: HttpContext) {
    const verifyCode = request.input('verify');

    if (!verifyCode) {
      return response.notFound();
    }

    const expectedCode = env.get('FITBIT_SUBSCRIBER_VERIFICATION_CODE');

    if (verifyCode === expectedCode) {
      logger.info('FitBit webhook verification successful');
      return response.noContent();
    }

    logger.warn('FitBit webhook verification failed - incorrect code');
    return response.notFound();
  }

  /**
   * Handle webhook notifications from FitBit.
   *
   * Must respond with 204 within 5 seconds.
   * Actual processing is queued to avoid timeout.
   */
  async handleNotification({ request, response }: HttpContext) {
    try {
      const rawBody = request.raw();

      if (!rawBody) {
        logger.warn('[FitBit Webhook] Empty request body');
        return response.badRequest({ error: 'Empty body' });
      }

      const signature = request.header('X-Fitbit-Signature');

      if (!this.verifySignature(rawBody, signature)) {
        logger.error('[FitBit Webhook] Signature verification failed - possible spoofing attempt');
        return response.unauthorized({ error: 'Invalid signature' });
      }

      logger.info('[FitBit Webhook] Signature verified successfully');

      const body = request.body();
      let notifications;

      try {
        notifications = await fitbitWebhookNotificationSchema.validate(body);
      } catch (error) {
        logger.error('[FitBit Webhook] Payload validation failed:', {
          error: error instanceof Error ? error.message : String(error),
          body,
        });
        return response.badRequest({ error: 'Invalid payload structure' });
      }

      logger.info(`[FitBit Webhook] Received ${notifications.length} validated notification(s)`);

      for (const notification of notifications) {
        await ProcessFitbitNotificationJob.dispatch(notification);

        logger.info('[FitBit Webhook] Queued notification:', {
          collectionType: notification.collectionType,
          date: notification.date,
          ownerId: notification.ownerId,
          subscriptionId: notification.subscriptionId,
        });
      }

      return response.noContent();
    } catch (error) {
      logger.error('[FitBit Webhook] Error handling notification:', error);
      // Still respond with 204 to avoid being marked as failed by FitBit
      return response.noContent();
    }
  }
}
