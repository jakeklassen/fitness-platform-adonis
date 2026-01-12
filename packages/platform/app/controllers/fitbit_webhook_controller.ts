import WebhookJob from '#models/webhook_job';
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
   * Verify X-Fitbit-Signature header using HMAC-SHA1
   * Based on: https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/
   *
   * FitBit uses: BASE64(HMAC-SHA1(body, "client_secret&"))
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
      // Key must be client_secret + "&"
      const signingKey = `${clientSecret}&`;

      // Compute HMAC-SHA1 of the raw body
      const hmac = createHmac('sha1', signingKey);
      hmac.update(body, 'utf8');
      const computedSignature = hmac.digest('base64');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const expectedBuffer = Buffer.from(signature, 'utf8');
      const computedBuffer = Buffer.from(computedSignature, 'utf8');

      if (expectedBuffer.length !== computedBuffer.length) {
        logger.warn('[FitBit Webhook] Signature length mismatch');
        return false;
      }

      // Use Node.js built-in constant-time comparison
      // (Safe to call since we've already checked lengths match)
      const isValid = timingSafeEqual(expectedBuffer, computedBuffer);

      if (!isValid) {
        logger.warn('[FitBit Webhook] Invalid signature', {
          expected: signature,
          computed: computedSignature,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('[FitBit Webhook] Signature verification error:', error);
      return false;
    }
  }

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
      // Get the raw body for signature verification (must be unmodified)
      const rawBody = request.raw();
      if (!rawBody) {
        logger.warn('[FitBit Webhook] Empty request body');
        return response.badRequest({ error: 'Empty body' });
      }

      // Verify X-Fitbit-Signature header
      const signature = request.header('X-Fitbit-Signature');
      if (!this.verifySignature(rawBody, signature)) {
        logger.error('[FitBit Webhook] Signature verification failed - possible spoofing attempt');
        return response.unauthorized({ error: 'Invalid signature' });
      }

      logger.info('[FitBit Webhook] Signature verified successfully');

      // Parse and validate the payload structure
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

      // Queue each notification for async processing
      for (const notification of notifications) {
        await WebhookJob.create({
          jobType: 'fitbit_notification',
          payload: notification,
          status: 'pending',
          retries: 0,
        });

        logger.info('[FitBit Webhook] Queued notification:', {
          collectionType: notification.collectionType,
          date: notification.date,
          ownerId: notification.ownerId,
          subscriptionId: notification.subscriptionId,
        });
      }

      // Must respond with 204 within 5 seconds
      return response.noContent();
    } catch (error) {
      logger.error('[FitBit Webhook] Error handling notification:', error);
      // Still respond with 204 to avoid being marked as failed by FitBit
      return response.noContent();
    }
  }
}
