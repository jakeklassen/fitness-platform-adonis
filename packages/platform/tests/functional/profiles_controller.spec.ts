import FitbitSubscription from '#models/fitbit_subscription';
import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

test.group('ProfilesController - unlinkAccount', (group) => {
  let user: User;
  let fitbitProvider: Provider;
  let account: ProviderAccount;

  group.each.setup(async () => {
    user = await User.create({
      email: `unlink-test-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Unlink Test User',
    });

    fitbitProvider = await Provider.findByOrFail('name', 'fitbit');

    account = await ProviderAccount.create({
      userId: user.id,
      providerId: fitbitProvider.id,
      providerUserId: `fitbit-unlink-${Date.now()}`,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    });
  });

  test('deletes active fitbit subscriptions when unlinking account', async ({ client, assert }) => {
    // Create active subscriptions in the database
    await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `unsub-test-1-${Date.now()}`,
      collectionType: 'activities',
      isActive: true,
    });

    await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `unsub-test-2-${Date.now()}`,
      collectionType: 'sleep',
      isActive: true,
    });

    // Mock fetch to intercept FitBit API calls for subscription deletion
    const originalFetch = globalThis.fetch;
    const fetchCalls: string[] = [];

    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      fetchCalls.push(url);

      if (url.includes('apiSubscriptions')) {
        return new Response(null, { status: 204 });
      }

      return originalFetch(input, init);
    };

    try {
      const response = await client
        .delete(`/profile/accounts/${account.id}`)
        .withCsrfToken()
        .loginAs(user)
        .redirects(0);

      response.assertStatus(302);
      response.assertHeader('location', '/profile');

      // Verify subscriptions were deleted from database
      const remainingSubs = await FitbitSubscription.query().where(
        'provider_account_id',
        account.id,
      );

      assert.lengthOf(remainingSubs, 0);

      // Verify FitBit API was called for each subscription
      const subCalls = fetchCalls.filter((url) => url.includes('apiSubscriptions'));

      assert.isAtLeast(subCalls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('unlink succeeds even if subscription deletion fails', async ({ client, assert }) => {
    await FitbitSubscription.create({
      userId: user.id,
      providerAccountId: account.id,
      subscriptionId: `unsub-fail-${Date.now()}`,
      collectionType: 'activities',
      isActive: true,
    });

    // Mock fetch to return errors for subscription deletion
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => {
      return new Response('Internal Server Error', { status: 500 });
    };

    try {
      const response = await client
        .delete(`/profile/accounts/${account.id}`)
        .withCsrfToken()
        .loginAs(user)
        .redirects(0);

      // Account unlink should still succeed
      response.assertStatus(302);

      // Verify the provider account was deleted
      const deletedAccount = await ProviderAccount.find(account.id);

      assert.isNull(deletedAccount);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
