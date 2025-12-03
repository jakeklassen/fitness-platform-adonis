import Account from '#models/account';
import { FitbitTokenRefreshService } from '#services/fitbit_token_refresh_service';
import { AllyService } from '@adonisjs/ally/types';

interface ActivityTimeSeriesData {
  dateTime: string;
  value: string;
}

export class FitbitService {
  private tokenRefreshService: FitbitTokenRefreshService;

  constructor(private ally?: AllyService) {
    this.tokenRefreshService = new FitbitTokenRefreshService();
  }

  /**
   * Get Fitbit user data with automatic token refresh
   * Returns null if account is not linked or token refresh fails
   */
  async getUserData(account: Account | undefined): Promise<any | null> {
    if (!account || !this.ally) {
      return null;
    }

    try {
      // Get valid access token (automatically refreshes if expired)
      const accessToken = await this.tokenRefreshService.getValidAccessToken(account);

      if (!accessToken) {
        return null;
      }

      // Fetch user data from Fitbit
      const fitbitUser = await this.ally.use('fitbit').userFromToken(accessToken);
      return fitbitUser.original;
    } catch (error) {
      console.error('Error fetching Fitbit user data:', error);
      return null;
    }
  }

  /**
   * Fetch activity time series data from Fitbit API
   * https://dev.fitbit.com/build/reference/web-api/activity-timeseries/get-activity-timeseries-by-date-range/
   *
   * @param account - User's Fitbit account
   * @param resource - Activity resource (e.g., 'steps', 'calories', 'distance')
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format (max 1 year from start)
   * @returns Array of daily activity data
   */
  async getActivityTimeSeries(
    account: Account,
    resource: string,
    startDate: string,
    endDate: string,
  ): Promise<ActivityTimeSeriesData[]> {
    try {
      // Get valid access token (automatically refreshes if expired)
      const accessToken = await this.tokenRefreshService.getValidAccessToken(account);

      if (!accessToken) {
        throw new Error('Failed to get valid access token');
      }

      // Construct Fitbit API URL
      // Format: /1/user/-/activities/{resource}/date/{start-date}/{end-date}.json
      const url = `https://api.fitbit.com/1/user/-/activities/${resource}/date/${startDate}/${endDate}.json`;

      // Make API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fitbit API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Response format: { "activities-{resource}": [{ dateTime: "YYYY-MM-DD", value: "123" }] }
      const resourceKey = `activities-${resource}`;
      return data[resourceKey] || [];
    } catch (error) {
      console.error(`Error fetching Fitbit ${resource} time series:`, error);
      throw error;
    }
  }

  /**
   * Fetch steps data for a specific date range
   * Convenience method for getting steps specifically
   */
  async getStepsTimeSeries(
    account: Account,
    startDate: string,
    endDate: string,
  ): Promise<ActivityTimeSeriesData[]> {
    return this.getActivityTimeSeries(account, 'steps', startDate, endDate);
  }
}
