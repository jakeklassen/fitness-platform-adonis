import ProviderAccount from '#models/provider_account';
import env from '#start/env';
import { DateTime } from 'luxon';

interface FitbitTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  user_id: string;
}

export class FitbitTokenRefreshService {
  /**
   * Check if token is expired or will expire soon (within 5 minutes)
   */
  private isTokenExpired(expiresAt: DateTime | null): boolean {
    if (!expiresAt) {
      return true;
    }

    // Consider token expired if it expires within 5 minutes
    const buffer = DateTime.now().plus({ minutes: 5 });
    return expiresAt <= buffer;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(account: ProviderAccount): Promise<string> {
    if (!account.refreshToken) {
      throw new Error('No refresh token available');
    }

    // If token is still valid, return it
    if (!this.isTokenExpired(account.expiresAt)) {
      return account.accessToken!;
    }

    try {
      // Make request to Fitbit token endpoint
      const credentials = Buffer.from(
        `${env.get('FITBIT_CLIENT_ID')}:${env.get('FITBIT_CLIENT_SECRET')}`,
      ).toString('base64');

      const response = await fetch('https://api.fitbit.com/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as FitbitTokenResponse;

      // Update account with new tokens
      account.accessToken = data.access_token;
      account.refreshToken = data.refresh_token;
      account.expiresAt = DateTime.now().plus({ seconds: data.expires_in });
      await account.save();

      return data.access_token;
    } catch (error) {
      console.error('Error refreshing Fitbit token:', error);
      throw error;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(account: ProviderAccount): Promise<string | null> {
    if (!account.accessToken) {
      return null;
    }

    try {
      return await this.refreshToken(account);
    } catch (error) {
      console.error('Failed to get valid access token:', error);
      return null;
    }
  }
}
