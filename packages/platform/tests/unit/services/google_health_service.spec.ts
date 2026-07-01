import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { GoogleHealthService } from '#services/google_health_service';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

async function makeAccountWithValidToken() {
  const user = await User.create({
    email: `g-health-${Date.now()}-${Math.round(performance.now())}@example.com`,
    password: 'secret123',
  });
  const provider = await Provider.findByOrFail('name', 'google_health');

  return ProviderAccount.create({
    userId: user.id,
    providerId: provider.id,
    providerUserId: `sub-${Date.now()}`,
    accessToken: 'valid-access',
    refreshToken: 'stored-refresh',
    // Future expiry so the token-refresh service returns it without a fetch,
    // leaving the mocked fetch for the Health API call.
    expiresAt: DateTime.now().plus({ hours: 1 }),
  });
}

test.group('GoogleHealthService', (group) => {
  let originalFetch: typeof globalThis.fetch;

  group.each.setup(() => {
    originalFetch = globalThis.fetch;
  });

  group.each.teardown(() => {
    globalThis.fetch = originalFetch;
  });

  test('aggregates step data points into per-day totals across pages', async ({ assert }) => {
    const account = await makeAccountWithValidToken();

    const pages = [
      {
        dataPoints: [
          { steps: { interval: { civilStartTime: '2026-06-01T00:00:00' }, count: 100 } },
          { steps: { interval: { civilStartTime: '2026-06-01T01:00:00' }, count: 50 } },
          { steps: { interval: { civilStartTime: '2026-06-02T00:00:00' }, count: 200 } },
        ],
        nextPageToken: 'page-2',
      },
      {
        // `count` as a string — Google frequently serializes numbers as strings.
        dataPoints: [
          { steps: { interval: { civilStartTime: '2026-06-02T02:00:00' }, count: '25' } },
        ],
      },
    ];

    let call = 0;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(pages[call++]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const result = await new GoogleHealthService().getDailySteps(account, {
      start: DateTime.fromISO('2026-06-01'),
      end: DateTime.fromISO('2026-06-03'),
    });

    assert.deepEqual(result, [
      { date: '2026-06-01', steps: 150 },
      { date: '2026-06-02', steps: 225 },
    ]);
    assert.equal(call, 2);
  });

  test('returns null when the Health API request fails', async ({ assert }) => {
    const account = await makeAccountWithValidToken();

    globalThis.fetch = async () => new Response('forbidden', { status: 403 });

    const result = await new GoogleHealthService().getDailySteps(account, {
      start: DateTime.fromISO('2026-06-01'),
      end: DateTime.fromISO('2026-06-03'),
    });

    assert.isNull(result);
  });
});
