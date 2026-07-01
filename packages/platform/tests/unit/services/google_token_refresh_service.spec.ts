import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { GoogleTokenRefreshService } from '#services/google_token_refresh_service';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

async function makeAccount(overrides: Partial<ProviderAccount> = {}) {
  const user = await User.create({
    email: `g-token-${Date.now()}-${Math.round(performance.now())}@example.com`,
    password: 'secret123',
  });
  const provider = await Provider.findByOrFail('name', 'google_health');

  return ProviderAccount.create({
    userId: user.id,
    providerId: provider.id,
    providerUserId: `sub-${Date.now()}`,
    accessToken: 'old-access',
    refreshToken: 'stored-refresh',
    expiresAt: DateTime.now().minus({ hours: 1 }),
    ...overrides,
  });
}

test.group('GoogleTokenRefreshService', (group) => {
  let originalFetch: typeof globalThis.fetch;

  group.each.setup(() => {
    originalFetch = globalThis.fetch;
  });

  group.each.teardown(() => {
    globalThis.fetch = originalFetch;
  });

  test('refreshes the access token and preserves the stored refresh token', async ({ assert }) => {
    const account = await makeAccount();

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          expires_in: 3600,
          scope: 'googlehealth',
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    const token = await new GoogleTokenRefreshService().refreshToken(account);

    assert.equal(token, 'new-access');

    await account.refresh();
    assert.equal(account.accessToken, 'new-access');
    assert.equal(account.refreshToken, 'stored-refresh');
    assert.isAbove(account.expiresAt?.toMillis() ?? 0, DateTime.now().toMillis());
  });

  test('returns the existing token without calling Google when still valid', async ({ assert }) => {
    const account = await makeAccount({
      accessToken: 'valid-access',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    });

    let called = false;
    globalThis.fetch = async () => {
      called = true;

      return new Response('{}', { status: 200 });
    };

    const token = await new GoogleTokenRefreshService().refreshToken(account);

    assert.equal(token, 'valid-access');
    assert.isFalse(called);
  });

  test('getValidAccessToken returns null when the refresh fails', async ({ assert }) => {
    const account = await makeAccount();

    globalThis.fetch = async () => new Response('invalid_grant', { status: 400 });

    const token = await new GoogleTokenRefreshService().getValidAccessToken(account);

    assert.isNull(token);
  });
});
