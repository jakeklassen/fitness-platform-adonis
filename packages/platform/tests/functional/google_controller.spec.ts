import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { GoogleHealthService } from '#services/google_health_service';
import { allyFake, type AllyFake } from '#tests/utils/ally_fake';
import app from '@adonisjs/core/services/app';
import type { health_v4 } from '@googleapis/health';
import { test } from '@japa/runner';

async function makeUser() {
  return User.create({
    email: `google-cb-${Date.now()}-${Math.round(performance.now())}@example.com`,
    password: 'secret123',
    fullName: 'Tester',
  });
}

/**
 * A GoogleHealthService whose getIdentity is stubbed — the OAuth callback calls
 * it, and we don't want tests reaching the real API.
 */
function fakeHealthService(healthUserId: string | null) {
  return new GoogleHealthService(
    () =>
      ({
        users: { getIdentity: async () => ({ data: { healthUserId } }) },
      }) as unknown as health_v4.Health,
  );
}

test.group('Google Health OAuth callback', (group) => {
  let ally: AllyFake;
  // Unique per test — the suite shares one transaction and provider_user_id is
  // unique per provider, so a fixed value would collide across tests.
  let healthUserId: string;

  group.each.setup(() => {
    ally = allyFake();
    healthUserId = `health-${Date.now()}-${Math.round(performance.now())}`;
    app.container.swap(GoogleHealthService, () => fakeHealthService(healthUserId));

    return () => {
      ally.restore();
      app.container.restore(GoogleHealthService);
    };
  });

  test('links a new google_health account and stores the tokens', async ({ client, assert }) => {
    const user = await makeUser();
    const sub = `sub-new-${Date.now()}`;

    ally.use('google').stubUser({
      id: sub,
      email: 'g@example.com',
      token: { token: 'access-1', refreshToken: 'refresh-1', expiresAt: null },
    });

    const response = await client.get('/auth/google/callback').loginAs(user).redirects(0);
    response.assertStatus(302);

    const provider = await Provider.findByOrFail('name', 'google_health');
    const account = await ProviderAccount.query()
      .where('user_id', user.id)
      .where('provider_id', provider.id)
      .firstOrFail();

    // provider_user_id is the Health API user id (from getIdentity), not the OAuth sub.
    assert.equal(account.providerUserId, healthUserId);
    assert.equal(account.accessToken, 'access-1');
    assert.equal(account.refreshToken, 'refresh-1');
  });

  test('rejects a first link that did not grant a refresh token', async ({ client, assert }) => {
    const user = await makeUser();

    ally.use('google').stubUser({
      id: `sub-noref-${Date.now()}`,
      email: 'g@example.com',
      token: { token: 'access', refreshToken: null, expiresAt: null },
    });

    await client.get('/auth/google/callback').loginAs(user).redirects(0);

    const provider = await Provider.findByOrFail('name', 'google_health');
    const account = await ProviderAccount.query()
      .where('user_id', user.id)
      .where('provider_id', provider.id)
      .first();

    assert.isNull(account);
  });

  test('rejects a google account already connected to another user', async ({ client, assert }) => {
    const provider = await Provider.findByOrFail('name', 'google_health');

    // The other user already owns the account for this Health user id.
    const otherUser = await makeUser();
    await ProviderAccount.create({
      userId: otherUser.id,
      providerId: provider.id,
      providerUserId: healthUserId,
      accessToken: 'other-access',
      refreshToken: 'other-refresh',
      expiresAt: null,
    });

    const user = await makeUser();
    ally.use('google').stubUser({
      id: `sub-${Date.now()}`,
      email: 'g@example.com',
      token: { token: 'access', refreshToken: 'refresh', expiresAt: null },
    });

    await client.get('/auth/google/callback').loginAs(user).redirects(0);

    const account = await ProviderAccount.query()
      .where('user_id', user.id)
      .where('provider_id', provider.id)
      .first();

    assert.isNull(account);
  });

  test('preserves the stored refresh token when Google omits it on re-consent', async ({
    client,
    assert,
  }) => {
    const provider = await Provider.findByOrFail('name', 'google_health');
    const sub = `sub-reconsent-${Date.now()}`;
    const user = await makeUser();

    await ProviderAccount.create({
      userId: user.id,
      providerId: provider.id,
      providerUserId: sub,
      accessToken: 'old-access',
      refreshToken: 'kept-refresh',
      expiresAt: null,
    });

    ally.use('google').stubUser({
      id: sub,
      email: 'g@example.com',
      token: { token: 'new-access', refreshToken: null, expiresAt: null },
    });

    await client.get('/auth/google/callback').loginAs(user).redirects(0);

    const account = await ProviderAccount.query()
      .where('user_id', user.id)
      .where('provider_id', provider.id)
      .firstOrFail();

    assert.equal(account.accessToken, 'new-access');
    assert.equal(account.refreshToken, 'kept-refresh');
  });
});
