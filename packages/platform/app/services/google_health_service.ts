import type ProviderAccount from '#models/provider_account';
import { GoogleTokenRefreshService } from '#services/google_token_refresh_service';
import logger from '@adonisjs/core/services/logger';
import type { DateTime } from 'luxon';

const HEALTH_API_BASE = 'https://health.googleapis.com/v4';

/**
 * Shapes verified against a real Google Health API `steps` response:
 * `count` is a string, and `civilStartTime` is a structured object (not a
 * string). Intervals are per-minute; the civil time is the user's local day.
 */
interface CivilDateTime {
  date?: { year?: number; month?: number; day?: number };
  time?: { hours?: number; minutes?: number };
}

interface StepsInterval {
  startTime?: string;
  endTime?: string;
  civilStartTime?: CivilDateTime;
  civilEndTime?: CivilDateTime;
}

interface StepsDataPoint {
  steps?: {
    interval?: StepsInterval;
    count?: number | string;
  };
}

interface DataPointsResponse {
  dataPoints?: StepsDataPoint[];
  nextPageToken?: string;
}

/**
 * Format a Google Health civil date as `YYYY-MM-DD`, or null if incomplete.
 */
function toCivilDate(civil: CivilDateTime | undefined): string | null {
  const date = civil?.date;

  if (!date?.year || !date?.month || !date?.day) {
    return null;
  }

  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');

  return `${date.year}-${month}-${day}`;
}

export interface DailyStepTotal {
  /** Civil date, YYYY-MM-DD. */
  date: string;
  steps: number;
}

/**
 * Reads fitness data from the Google Health API for a linked account. Reads are
 * triggered after a (verified) webhook notification tells us a user's data
 * changed; this service fetches the actual records.
 */
export class GoogleHealthService {
  constructor(private tokenRefresh = new GoogleTokenRefreshService()) {}

  /**
   * Fetch step data points between two civil dates (inclusive start, exclusive
   * end) and aggregate them into per-day totals. Returns null on auth/API error.
   */
  async getDailySteps(
    account: ProviderAccount,
    range: { start: DateTime; end: DateTime },
  ): Promise<DailyStepTotal[] | null> {
    const accessToken = await this.tokenRefresh.getValidAccessToken(account);

    if (!accessToken) {
      logger.error({ accountId: account.id }, 'No valid Google access token for Health API');

      return null;
    }

    const startDate = range.start.toISODate();
    const endDate = range.end.toISODate();

    if (!startDate || !endDate) {
      throw new Error('Invalid date range');
    }

    const filter =
      `steps.interval.civil_start_time >= "${startDate}" ` +
      `AND steps.interval.civil_start_time < "${endDate}"`;

    const totals = new Map<string, number>();
    let pageToken: string | undefined;

    try {
      do {
        const url = new URL(`${HEALTH_API_BASE}/users/me/dataTypes/steps/dataPoints`);
        url.searchParams.set('filter', filter);
        url.searchParams.set('pageSize', '10000');

        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(`Google Health steps request failed: ${response.status} ${errorText}`);
        }

        const data = (await response.json()) as DataPointsResponse;

        for (const point of data.dataPoints ?? []) {
          const date = toCivilDate(point.steps?.interval?.civilStartTime);
          const count = Number(point.steps?.count ?? 0);

          if (!date || Number.isNaN(count)) {
            continue;
          }

          totals.set(date, (totals.get(date) ?? 0) + count);
        }

        pageToken = data.nextPageToken || undefined;
      } while (pageToken);
    } catch (error) {
      logger.error({ err: error, accountId: account.id }, 'Failed to fetch Google Health steps');

      return null;
    }

    return [...totals.entries()]
      .map(([date, steps]) => ({ date, steps }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
