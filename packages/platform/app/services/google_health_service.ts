import type ProviderAccount from '#models/provider_account';
import env from '#start/env';
import logger from '@adonisjs/core/services/logger';
import { auth, health, type health_v4 } from '@googleapis/health';
import { DateTime } from 'luxon';

export interface DailyStepTotal {
  /** Civil date, YYYY-MM-DD. */
  date: string;
  steps: number;
}

type HealthClient = health_v4.Health;

/**
 * Build an authenticated Google Health client for an account. google-auth-library
 * refreshes the access token automatically when it's expired and emits `tokens`,
 * which we persist back to the account (Google reuses the refresh token).
 */
function buildHealthClient(account: ProviderAccount): HealthClient {
  // Use the OAuth2 client re-exported by @googleapis/health so its
  // google-auth-library version matches the one the client expects.
  const oauth2 = new auth.OAuth2({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
  });

  oauth2.setCredentials({
    access_token: account.accessToken ?? undefined,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.expiresAt?.toMillis(),
  });

  oauth2.on('tokens', (tokens) => {
    if (tokens.access_token) {
      account.accessToken = tokens.access_token;
    }

    if (tokens.expiry_date) {
      account.expiresAt = DateTime.fromMillis(tokens.expiry_date);
    }

    void account.save();
  });

  return health({ version: 'v4', auth: oauth2 });
}

function toCivilDate(civil: health_v4.Schema$CivilDateTime | undefined): string | null {
  const date = civil?.date;

  if (!date?.year || !date?.month || !date?.day) {
    return null;
  }

  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');

  return `${date.year}-${month}-${day}`;
}

function toCivil(dt: DateTime): health_v4.Schema$CivilDateTime {
  return { date: { year: dt.year, month: dt.month, day: dt.day } };
}

/**
 * Reads fitness data from the Google Health API for a linked account, using the
 * generated `@googleapis/health` client. Reads are triggered after a (verified)
 * webhook notification tells us a user's data changed.
 */
export class GoogleHealthService {
  constructor(
    private buildClient: (account: ProviderAccount) => HealthClient = buildHealthClient,
  ) {}

  /**
   * Fetch per-day step totals between two civil dates (inclusive start, exclusive
   * end) using the server-side daily rollup. Returns null on API/auth error.
   */
  async getDailySteps(
    account: ProviderAccount,
    range: { start: DateTime; end: DateTime },
  ): Promise<DailyStepTotal[] | null> {
    const client = this.buildClient(account);

    try {
      const response = await client.users.dataTypes.dataPoints.dailyRollUp({
        parent: 'users/me/dataTypes/steps',
        requestBody: {
          range: { start: toCivil(range.start), end: toCivil(range.end) },
          windowSizeDays: 1,
        },
      });

      const results: DailyStepTotal[] = [];

      for (const point of response.data.rollupDataPoints ?? []) {
        const date = toCivilDate(point.civilStartTime);
        const steps = Number(point.steps?.countSum ?? Number.NaN);

        if (date && !Number.isNaN(steps)) {
          results.push({ date, steps });
        }
      }

      return results.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error({ err: error, accountId: account.id }, 'Failed to fetch Google Health steps');

      return null;
    }
  }
}
