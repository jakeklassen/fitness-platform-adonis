import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { HttpContext } from '@adonisjs/core/http';
import { test } from '@japa/runner';

/**
 * `ctx.ally` is a re-registrable `HttpContext.getter`, so we override it to
 * inject a fake Google driver instead of performing a real OAuth handshake.
 */
const originalAllyDescriptor = Object.getOwnPropertyDescriptor(HttpContext.prototype, 'ally');

type FakeToken = { token: string; refreshToken: string | null; expiresAt: Date | null };
type FakeGoogleUser = { id: string; email: string; token: FakeToken };

function stubAlly(googleUser: FakeGoogleUser, flags: { accessDenied?: boolean } = {}) {
  const driver = {
    accessDenied: () => flags.accessDenied ?? false,
    stateMisMatch: () => false,
    hasError: () => false,
    getError: () => null,
    user: async () => googleUser,
  };

  HttpContext.getter('ally', () => ({ use: () => driver }) as never, true);
}

async function makeUser() {
  return User.create({
    email: `google-cb-${Date.now()}-${Math.round(performance.now())}@example.com`,
    password: 'secret123',
    fullName: 'Tester',
  });
}

test.group('Google Health OAuth callback', (group) => {
  group.each.teardown(() => {
    if (originalAllyDescriptor) {
      Object.defineProperty(HttpContext.prototype, 'ally', originalAllyDescriptor);
    }
  });

  test('links a new google_health account and stores the tokens', async ({ client, assert }) => {
    const user = await makeUser();
    const sub = `sub-new-${Date.now()}`;

    stubAlly({
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

    assert.equal(account.providerUserId, sub);
    assert.equal(account.accessToken, 'access-1');
    assert.equal(account.refreshToken, 'refresh-1');
  });

  test('rejects a first link that did not grant a refresh token', async ({ client, assert }) => {
    const user = await makeUser();

    stubAlly({
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
    const sharedSub = `sub-shared-${Date.now()}`;

    const otherUser = await makeUser();
    await ProviderAccount.create({
      userId: otherUser.id,
      providerId: provider.id,
      providerUserId: sharedSub,
      accessToken: 'other-access',
      refreshToken: 'other-refresh',
      expiresAt: null,
    });

    const user = await makeUser();
    stubAlly({
      id: sharedSub,
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

    stubAlly({
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
