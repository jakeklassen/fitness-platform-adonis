import ActivityStep from '#models/activity_step';
import FitbitSubscription from '#models/fitbit_subscription';
import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { FitbitNotificationProcessor } from '#services/fitbit_notification_processor';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

async function createTestUserWithAccount() {
  const user = await User.create({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    fullName: 'Test User',
  });

  const provider = await Provider.findByOrFail('name', 'fitbit');

  const account = await ProviderAccount.create({
    userId: user.id,
    providerId: provider.id,
    providerUserId: `fitbit-user-${Date.now()}`,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: DateTime.now().plus({ hours: 1 }),
  });

  return { user, provider, account };
}

test.group('FitbitNotificationProcessor', (group) => {
  let originalFetch: typeof globalThis.fetch;

  group.setup(() => {
    originalFetch = globalThis.fetch;
  });

  group.teardown(() => {
    globalThis.fetch = originalFetch;
  });

  group.each.teardown(() => {
    globalThis.fetch = originalFetch;
  });

  test('processNotification looks up account by ownerId and fetches steps', async ({ assert }) => {
    const { user, account } = await createTestUserWithAccount();
    const today = DateTime.now().toISODate()!;

    globalThis.fetch = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();

      // Handle token refresh endpoint
      if (url.includes('oauth2/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'refreshed-token',
            expires_in: 3600,
            refresh_token: 'new-refresh-token',
            scope: 'activity',
            token_type: 'Bearer',
            user_id: account.providerUserId,
          }),
          { status: 200 },
        );
      }

      // Handle steps API endpoint
      if (url.includes('activities/steps')) {
        return new Response(
          JSON.stringify({
            'activities-steps': [{ dateTime: today, value: '8500' }],
          }),
          { status: 200 },
        );
      }

      return new Response('Not Found', { status: 404 });
    };

    const processor = new FitbitNotificationProcessor();
    const result = await processor.processNotification({
      collectionType: 'activities',
      date: today,
      ownerId: account.providerUserId,
      ownerType: 'user',
      subscriptionId: 'test-sub',
    });

    assert.isTrue(result);

    const step = await ActivityStep.query()
      .where('provider_account_id', account.id)
      .where('date', today)
      .first();

    assert.isNotNull(step);
    assert.equal(step!.steps, 8500);
    assert.equal(step!.granularity, 'daily');

    // Verify aggregation ran (daily_steps should have an entry)
    const dailyStep = await user.related('dailySteps').query().where('date', today).first();

    assert.isNotNull(dailyStep);
    assert.equal(dailyStep!.steps, 8500);
  });

  test('processNotification skips non-activities collection types', async ({ assert }) => {
    const { account } = await createTestUserWithAccount();

    const processor = new FitbitNotificationProcessor();
    const result = await processor.processNotification({
      collectionType: 'sleep',
      date: '2024-01-15',
      ownerId: account.providerUserId,
      ownerType: 'user',
      subscriptionId: 'test-sub',
    });

    assert.isTrue(result);
  });

  test('processNotification returns false for missing account', async ({ assert }) => {
    const processor = new FitbitNotificationProcessor();
    const result = await processor.processNotification({
      collectionType: 'activities',
      date: '2024-01-15',
      ownerId: 'nonexistent-user-id',
      ownerType: 'user',
      subscriptionId: 'test-sub',
    });

    assert.isFalse(result);
  });

  test('handleUserRevokedAccess clears tokens and deactivates subscriptions', async ({
    assert,
  }) => {
    const { user, account } = await createTestUserWithAccount();

    await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `revoke-test-${Date.now()}`,
      collectionType: 'activities',
      isActive: true,
    });

    const processor = new FitbitNotificationProcessor();
    const result = await processor.handleUserRevokedAccess(account.providerUserId);

    assert.isTrue(result);

    await account.refresh();

    assert.isNull(account.accessToken);
    assert.isNull(account.refreshToken);
    assert.isNull(account.expiresAt);

    const subs = await FitbitSubscription.query()
      .where('provider_account_id', account.id)
      .where('is_active', true);

    assert.lengthOf(subs, 0);
  });

  test('handleDeleteUser clears tokens and deactivates subscriptions', async ({ assert }) => {
    const { user, account } = await createTestUserWithAccount();

    await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `delete-test-${Date.now()}`,
      collectionType: 'activities',
      isActive: true,
    });

    const processor = new FitbitNotificationProcessor();
    const result = await processor.handleDeleteUser(account.providerUserId);

    assert.isTrue(result);

    await account.refresh();

    assert.isNull(account.accessToken);
    assert.isNull(account.refreshToken);
  });
});
