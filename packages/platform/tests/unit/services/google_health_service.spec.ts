import type ProviderAccount from '#models/provider_account';
import { GoogleHealthService } from '#services/google_health_service';
import type { health_v4 } from '@googleapis/health';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

const account = { id: 1 } as unknown as ProviderAccount;
const range = { start: DateTime.fromISO('2026-06-01'), end: DateTime.fromISO('2026-06-03') };

function fakeClient(
  response: health_v4.Schema$DailyRollUpDataPointsResponse | null,
  opts: { throws?: boolean } = {},
) {
  return {
    users: {
      dataTypes: {
        dataPoints: {
          dailyRollUp: async () => {
            if (opts.throws) {
              throw new Error('Health API error');
            }

            return { data: response };
          },
        },
      },
    },
  } as unknown as health_v4.Health;
}

test.group('GoogleHealthService', () => {
  test('maps daily rollup points to sorted per-day totals', async ({ assert }) => {
    const service = new GoogleHealthService(() =>
      fakeClient({
        rollupDataPoints: [
          {
            civilStartTime: { date: { year: 2026, month: 6, day: 2 } },
            steps: { countSum: '225' },
          },
          {
            civilStartTime: { date: { year: 2026, month: 6, day: 1 } },
            steps: { countSum: '150' },
          },
        ],
      }),
    );

    const result = await service.getDailySteps(account, range);

    assert.deepEqual(result, [
      { date: '2026-06-01', steps: 150 },
      { date: '2026-06-02', steps: 225 },
    ]);
  });

  test('skips rollup points missing a date or step count', async ({ assert }) => {
    const service = new GoogleHealthService(() =>
      fakeClient({
        rollupDataPoints: [
          {
            civilStartTime: { date: { year: 2026, month: 6, day: 1 } },
            steps: { countSum: '100' },
          },
          { steps: { countSum: '50' } },
          { civilStartTime: { date: { year: 2026, month: 6, day: 2 } } },
        ],
      }),
    );

    const result = await service.getDailySteps(account, range);

    assert.deepEqual(result, [{ date: '2026-06-01', steps: 100 }]);
  });

  test('returns null when the Health API call fails', async ({ assert }) => {
    const service = new GoogleHealthService(() => fakeClient(null, { throws: true }));

    const result = await service.getDailySteps(account, range);

    assert.isNull(result);
  });
});
