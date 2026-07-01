import type ProviderAccount from '#models/provider_account';
import env from '#start/env';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Refreshes Google OAuth access tokens for the Google Health API.
 *
 * Unlike Fitbit, Google does NOT return a new refresh token on refresh — the
 * originally-issued refresh token is reused, so we only update the access token
 * and its expiry.
 */
export class GoogleTokenRefreshService {
  /**
   * Whether the token is missing, expired, or expires within a 5-minute buffer.
   */
  private isTokenExpired(expiresAt: DateTime | null): boolean {
    if (!expiresAt) {
      return true;
    }

    const buffer = DateTime.now().plus({ minutes: 5 });

    return expiresAt <= buffer;
  }

  /**
   * Refresh the access token using the stored refresh token.
   */
  async refreshToken(account: ProviderAccount): Promise<string> {
    if (!account.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (account.accessToken && !this.isTokenExpired(account.expiresAt)) {
      return account.accessToken;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.get('GOOGLE_CLIENT_ID'),
        client_secret: env.get('GOOGLE_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`Failed to refresh Google token: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as GoogleTokenResponse;

    account.accessToken = data.access_token;
    account.expiresAt = DateTime.now().plus({ seconds: data.expires_in });
    await account.save();

    return data.access_token;
  }

  /**
   * Get a valid access token, refreshing if necessary. Returns null on failure.
   */
  async getValidAccessToken(account: ProviderAccount): Promise<string | null> {
    if (!account.accessToken) {
      return null;
    }

    try {
      return await this.refreshToken(account);
    } catch (error) {
      logger.error({ err: error }, 'Failed to get valid Google access token');

      return null;
    }
  }
}
