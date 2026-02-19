import FitbitSubscription from '#models/fitbit_subscription';
import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { FitbitSubscriptionService } from '#services/fitbit_subscription_service';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

/**
 * Helper to create a test user with a FitBit provider account.
 * Sets expiresAt to the future so the token refresh service
 * considers the token valid and skips the refresh flow.
 */
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

test.group('FitbitSubscriptionService', (group) => {
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

  test('createSubscription makes correct API call and stores subscription on 201', async ({
    assert,
  }) => {
    const { user, account } = await createTestUserWithAccount();

    globalThis.fetch = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      assert.match(url, /api\.fitbit\.com.*activities.*apiSubscriptions/);

      return new Response(
        JSON.stringify({
          collectionType: 'activities',
          ownerId: account.providerUserId,
          ownerType: 'user',
          subscriberId: 'test-subscriber',
          subscriptionId: `${user.id}-activities-12345`,
        }),
        { status: 201 },
      );
    };

    const service = new FitbitSubscriptionService();
    const subscription = await service.createSubscription(account, 'activities');

    assert.isNotNull(subscription);
    assert.equal(subscription!.userId, user.id);
    assert.equal(subscription!.providerAccountId, account.id);
    assert.equal(subscription!.collectionType, 'activities');
    assert.equal(subscription!.isActive, true);
    assert.equal(subscription!.fitbitSubscriberId, 'test-subscriber');
  });

  test('createSubscription handles 409 conflict by upserting', async ({ assert }) => {
    const { user, account } = await createTestUserWithAccount();
    const subscriptionId = `existing-sub-${Date.now()}`;

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          collectionType: 'activities',
          ownerId: account.providerUserId,
          ownerType: 'user',
          subscriberId: 'test-subscriber',
          subscriptionId,
        }),
        { status: 409 },
      );
    };

    const service = new FitbitSubscriptionService();
    const subscription = await service.createSubscription(account, 'activities');

    assert.isNotNull(subscription);
    assert.equal(subscription!.subscriptionId, subscriptionId);
    assert.equal(subscription!.userId, user.id);
  });

  test('createSubscription returns null on API failure', async ({ assert }) => {
    const { account } = await createTestUserWithAccount();

    globalThis.fetch = async () => {
      return new Response('Internal Server Error', { status: 500 });
    };

    const service = new FitbitSubscriptionService();
    const subscription = await service.createSubscription(account, 'activities');

    assert.isNull(subscription);
  });

  test('deleteSubscription makes correct API call and removes from database', async ({
    assert,
  }) => {
    const { user, account } = await createTestUserWithAccount();

    const subscription = await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `delete-test-${Date.now()}`,
      collectionType: 'activities',
      fitbitSubscriberId: 'test-subscriber',
      isActive: true,
    });

    let deleteCalled = false;

    globalThis.fetch = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      assert.match(url, /activities.*apiSubscriptions/);
      deleteCalled = true;

      return new Response(null, { status: 204 });
    };

    const service = new FitbitSubscriptionService();
    const result = await service.deleteSubscription(account, subscription);

    assert.isTrue(result);
    assert.isTrue(deleteCalled);

    const found = await FitbitSubscription.find(subscription.id);

    assert.isNull(found);
  });

  test('deleteSubscription handles 404 gracefully', async ({ assert }) => {
    const { user, account } = await createTestUserWithAccount();

    const subscription = await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `delete-404-${Date.now()}`,
      collectionType: 'activities',
      isActive: true,
    });

    globalThis.fetch = async () => {
      return new Response(null, { status: 404 });
    };

    const service = new FitbitSubscriptionService();
    const result = await service.deleteSubscription(account, subscription);

    assert.isTrue(result);
  });

  test('listSubscriptions parses API response', async ({ assert }) => {
    const { account } = await createTestUserWithAccount();

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          apiSubscriptions: [
            {
              collectionType: 'activities',
              ownerId: account.providerUserId,
              ownerType: 'user',
              subscriberId: 'sub-1',
              subscriptionId: 'sub-id-1',
            },
            {
              collectionType: 'sleep',
              ownerId: account.providerUserId,
              ownerType: 'user',
              subscriberId: 'sub-2',
              subscriptionId: 'sub-id-2',
            },
          ],
        }),
        { status: 200 },
      );
    };

    const service = new FitbitSubscriptionService();
    const subscriptions = await service.listSubscriptions(account);

    assert.lengthOf(subscriptions, 2);
    assert.equal(subscriptions[0].subscriptionId, 'sub-id-1');
    assert.equal(subscriptions[1].subscriptionId, 'sub-id-2');
  });

  test('syncSubscriptions marks missing subs as inactive', async ({ assert }) => {
    const { user, account } = await createTestUserWithAccount();

    const activeSub = await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `existing-sub-${Date.now()}`,
      collectionType: 'activities',
      isActive: true,
    });

    const missingSub = await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `missing-sub-${Date.now()}`,
      collectionType: 'sleep',
      isActive: true,
    });

    // API only returns the first subscription
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          apiSubscriptions: [
            {
              collectionType: 'activities',
              ownerId: account.providerUserId,
              ownerType: 'user',
              subscriberId: 'sub-1',
              subscriptionId: activeSub.subscriptionId,
            },
          ],
        }),
        { status: 200 },
      );
    };

    const service = new FitbitSubscriptionService();
    await service.syncSubscriptions(account);

    await activeSub.refresh();
    await missingSub.refresh();

    assert.isTrue(activeSub.isActive);
    assert.isFalse(missingSub.isActive);
  });
});
