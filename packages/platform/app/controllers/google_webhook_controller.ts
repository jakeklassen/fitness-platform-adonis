import ProcessGoogleHealthNotificationJob, {
  type GoogleHealthNotification,
} from '#jobs/process_google_health_notification_job';
import { GoogleHealthWebhookVerifier } from '#services/google_health_webhook_verifier';
import env from '#start/env';
import type { HttpContext } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger';
import vine from '@vinejs/vine';
import { timingSafeEqual } from 'node:crypto';

// Module-level so the fetched keyset is cached across requests. Exported so tests
// can load a keyset without reaching the network.
export const webhookVerifier = new GoogleHealthWebhookVerifier();

// Google delivers a JSON array of notification envelopes, each wrapping `data`.
const notificationsSchema = vine.compile(
  vine.array(
    vine.object({
      data: vine.object({
        healthUserId: vine.string().trim().minLength(1),
        operation: vine.enum(['UPSERT', 'DELETE']),
        dataType: vine.string().trim().minLength(1),
        intervals: vine
          .array(
            // Intervals arrive in varying shapes (physical/civil/…); we only
            // read physicalTimeInterval, so keep it optional and ignore the rest.
            vine.object({
              physicalTimeInterval: vine
                .object({
                  startTime: vine.string(),
                  endTime: vine.string(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    }),
  ),
);

/**
 * Constant-time comparison of the incoming Authorization header against the
 * configured webhook secret (the full header value, e.g. "Bearer <secret>").
 */
function authorized(header: string | undefined): boolean {
  if (!header) {
    return false;
  }

  const provided = Buffer.from(header);
  const expected = Buffer.from(env.get('GOOGLE_WEBHOOK_SECRET'));

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export default class GoogleWebhookController {
  /**
   * Receive Google Health webhook notifications.
   *
   * Handles the two-step verification handshake (authorized → 200,
   * unauthorized → 401), verifies the Tink signature on real notifications,
   * then queues processing and responds 204 immediately.
   */
  async handleNotification({ request, response }: HttpContext) {
    // Authorization secret. Doubles as the handshake: Google probes the endpoint
    // with and without credentials, expecting 200 and 401 respectively.
    if (!authorized(request.header('authorization'))) {
      return response.unauthorized({ error: 'Unauthorized' });
    }

    const body = request.body();

    // Endpoint verification handshake — not signed.
    if (body?.type === 'verification') {
      logger.info('[Google Webhook] Verification handshake accepted');
      return response.ok({ ok: true });
    }

    // Verify the Tink signature over the raw body for real notifications.
    const rawBody = request.raw();

    if (!rawBody) {
      return response.badRequest({ error: 'Empty body' });
    }

    const signature = request.header('x-healthapi-signature');

    if (!(await webhookVerifier.verify(Buffer.from(rawBody), signature))) {
      logger.error('[Google Webhook] Signature verification failed - possible spoofing attempt');
      return response.forbidden({ error: 'Invalid signature' });
    }

    let notifications: Array<{ data: GoogleHealthNotification }>;

    try {
      notifications = await notificationsSchema.validate(body);
    } catch (error) {
      logger.error({ err: error }, '[Google Webhook] Payload validation failed');
      return response.badRequest({ error: 'Invalid payload structure' });
    }

    for (const notification of notifications) {
      await ProcessGoogleHealthNotificationJob.dispatch(notification.data);

      logger.info(
        {
          healthUserId: notification.data.healthUserId,
          operation: notification.data.operation,
          dataType: notification.data.dataType,
        },
        '[Google Webhook] Queued notification',
      );
    }

    return response.noContent();
  }
}
