import ProcessFitbitNotificationJob from '#jobs/process_fitbit_notification_job';
import env from '#start/env';
import { test } from '@japa/runner';
import queue from '@adonisjs/queue/services/main';
import { createHmac } from 'node:crypto';

/**
 * Compute the HMAC-SHA1 signature the same way FitBit does:
 * BASE64(HMAC-SHA1(body, "client_secret&"))
 */
function computeSignature(body: string): string {
  const clientSecret = env.get('FITBIT_CLIENT_SECRET');
  const signingKey = `${clientSecret}&`;
  const hmac = createHmac('sha1', signingKey);
  hmac.update(body, 'utf8');

  return hmac.digest('base64');
}

const sampleNotification = [
  {
    collectionType: 'activities',
    date: '2024-01-15',
    ownerId: 'fitbit-user-123',
    ownerType: 'user',
    subscriptionId: 'sub-123',
  },
];

test.group('FitbitWebhookController - GET verification', () => {
  test('responds with 204 for correct verification code', async ({ client }) => {
    const verifyCode = env.get('FITBIT_SUBSCRIBER_VERIFICATION_CODE');

    const response = await client.get(`/webhooks/fitbit?verify=${verifyCode}`);

    response.assertStatus(204);
  });

  test('responds with 404 for incorrect verification code', async ({ client }) => {
    const response = await client.get('/webhooks/fitbit?verify=wrong-code');

    response.assertStatus(404);
  });

  test('responds with 404 when verify param is missing', async ({ client }) => {
    const response = await client.get('/webhooks/fitbit');

    response.assertStatus(404);
  });
});

test.group('FitbitWebhookController - POST notification', (group) => {
  group.each.setup(() => {
    return () => {
      queue.restore();
    };
  });

  test('accepts valid signature and dispatches job', async ({ client }) => {
    const fake = queue.fake();
    const body = JSON.stringify(sampleNotification);
    const signature = computeSignature(body);

    const response = await client
      .post('/webhooks/fitbit')
      .header('X-Fitbit-Signature', signature)
      .json(sampleNotification);

    response.assertStatus(204);
    fake.assertPushed(ProcessFitbitNotificationJob);
    fake.assertPushedCount(1);
  });

  test('rejects request with missing signature', async ({ client }) => {
    const response = await client.post('/webhooks/fitbit').json(sampleNotification);

    response.assertStatus(401);
  });

  test('rejects request with invalid signature', async ({ client }) => {
    const response = await client
      .post('/webhooks/fitbit')
      .header('X-Fitbit-Signature', 'invalid-signature')
      .json(sampleNotification);

    response.assertStatus(401);
  });

  test('dispatches one job per notification in a batch', async ({ client, assert }) => {
    const fake = queue.fake();
    const batchPayload = [
      {
        collectionType: 'activities',
        date: '2024-01-15',
        ownerId: 'fitbit-user-1',
        ownerType: 'user',
        subscriptionId: 'sub-1',
      },
      {
        collectionType: 'sleep',
        date: '2024-01-15',
        ownerId: 'fitbit-user-2',
        ownerType: 'user',
        subscriptionId: 'sub-2',
      },
      {
        collectionType: 'activities',
        date: '2024-01-16',
        ownerId: 'fitbit-user-3',
        ownerType: 'user',
        subscriptionId: 'sub-3',
      },
    ];

    const body = JSON.stringify(batchPayload);
    const signature = computeSignature(body);

    const response = await client
      .post('/webhooks/fitbit')
      .header('X-Fitbit-Signature', signature)
      .json(batchPayload);

    response.assertStatus(204);
    fake.assertPushedCount(3);

    const pushed = fake.getPushedJobs();

    assert.equal(pushed[0].job.payload.ownerId, 'fitbit-user-1');
    assert.equal(pushed[1].job.payload.ownerId, 'fitbit-user-2');
    assert.equal(pushed[2].job.payload.ownerId, 'fitbit-user-3');
  });

  test('rejects invalid payload structure', async ({ client }) => {
    const fake = queue.fake();
    const invalidPayload = [{ invalid: 'data' }];
    const body = JSON.stringify(invalidPayload);
    const signature = computeSignature(body);

    const response = await client
      .post('/webhooks/fitbit')
      .header('X-Fitbit-Signature', signature)
      .json(invalidPayload);

    response.assertStatus(400);
    fake.assertNothingPushed();
  });

  test('returns 204 on valid request even with job dispatch', async ({ client }) => {
    const fake = queue.fake();
    const body = JSON.stringify(sampleNotification);
    const signature = computeSignature(body);

    const response = await client
      .post('/webhooks/fitbit')
      .header('X-Fitbit-Signature', signature)
      .json(sampleNotification);

    response.assertStatus(204);
    fake.assertPushed(ProcessFitbitNotificationJob);
  });
});
