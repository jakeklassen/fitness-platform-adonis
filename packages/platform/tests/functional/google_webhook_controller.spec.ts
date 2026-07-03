import { webhookVerifier } from '#controllers/google_webhook_controller';
import ProcessGoogleHealthNotificationJob from '#jobs/process_google_health_notification_job';
import env from '#start/env';
import { makeTinkSigner } from '#tests/utils/tink_signer';
import queue from '@adonisjs/queue/services/main';
import { test } from '@japa/runner';

const AUTH = env.get('GOOGLE_WEBHOOK_SECRET');

const notification = {
  data: {
    version: '1',
    healthUserId: 'health-user-123',
    operation: 'UPSERT',
    dataType: 'steps',
    intervals: [
      {
        physicalTimeInterval: {
          startTime: '2026-07-03T01:00:00Z',
          endTime: '2026-07-03T01:05:00Z',
        },
      },
    ],
  },
};

test.group('Google Health webhook', (group) => {
  let signer: ReturnType<typeof makeTinkSigner>;

  group.each.setup(() => {
    signer = makeTinkSigner();
    // Load the test keyset into the controller's verifier so it won't reach the network.
    webhookVerifier.loadKeyset(signer.keyset);

    return () => queue.restore();
  });

  test('accepts the verification handshake with valid credentials', async ({ client }) => {
    const response = await client
      .post('/webhooks/google')
      .header('authorization', AUTH)
      .json({ type: 'verification' });

    response.assertStatus(200);
  });

  test('rejects the verification handshake without credentials', async ({ client }) => {
    const response = await client.post('/webhooks/google').json({ type: 'verification' });

    response.assertStatus(401);
  });

  test('verifies a signed notification and queues processing', async ({ client }) => {
    const fake = queue.fake();
    const signature = signer.sign(JSON.stringify(notification));

    const response = await client
      .post('/webhooks/google')
      .header('authorization', AUTH)
      .header('google-health-api-signature', signature)
      .json(notification);

    response.assertStatus(204);
    fake.assertPushed(ProcessGoogleHealthNotificationJob);
    fake.assertPushedCount(1);
  });

  test('rejects a notification whose signature does not match the body', async ({ client }) => {
    const fake = queue.fake();
    // Sign a different body than the one we send.
    const signature = signer.sign(JSON.stringify({ data: 'something-else' }));

    const response = await client
      .post('/webhooks/google')
      .header('authorization', AUTH)
      .header('google-health-api-signature', signature)
      .json(notification);

    response.assertStatus(403);
    fake.assertPushedCount(0);
  });

  test('rejects a notification without credentials', async ({ client }) => {
    const fake = queue.fake();
    const signature = signer.sign(JSON.stringify(notification));

    const response = await client
      .post('/webhooks/google')
      .header('google-health-api-signature', signature)
      .json(notification);

    response.assertStatus(401);
    fake.assertPushedCount(0);
  });
});
