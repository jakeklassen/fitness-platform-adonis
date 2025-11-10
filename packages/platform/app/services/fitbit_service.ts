import Account from '#models/account';
import { FitbitTokenRefreshService } from '#services/fitbit_token_refresh_service';
import { AllyService } from '@adonisjs/ally/types';

export class FitbitService {
  private tokenRefreshService: FitbitTokenRefreshService;

  constructor(private ally: AllyService) {
    this.tokenRefreshService = new FitbitTokenRefreshService();
  }

  /**
   * Get Fitbit user data with automatic token refresh
   * Returns null if account is not linked or token refresh fails
   */
  async getUserData(account: Account | undefined): Promise<any | null> {
    if (!account) {
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
}
