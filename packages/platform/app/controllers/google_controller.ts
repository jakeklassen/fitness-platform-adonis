import Provider from '#models/provider';
import ProviderAccount from '#models/provider_account';
import { GoogleHealthService } from '#services/google_health_service';
import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

@inject()
export default class GoogleController {
  constructor(private googleHealth: GoogleHealthService) {}

  /**
   * Redirect to Google to authorize Google Health access. Scopes + offline
   * access are configured on the `google` provider in `config/ally.ts`.
   */
  async redirect({ ally }: HttpContext) {
    return ally.use('google').redirect();
  }

  /**
   * Handle the OAuth callback from Google and link the Google Health account.
   */
  async callback({ ally, auth, response, session }: HttpContext) {
    const google = ally.use('google');

    if (google.accessDenied()) {
      session.flash('error', 'You denied access to your Google Health data');
      return response.redirect('/profile');
    }

    if (google.stateMisMatch()) {
      session.flash('error', 'Invalid state. Please try again.');
      return response.redirect('/profile');
    }

    if (google.hasError()) {
      session.flash('error', google.getError() || 'An error occurred during authorization');
      return response.redirect('/profile');
    }

    const user = auth.getUserOrFail();
    const googleUser = await google.user();
    const { token } = googleUser;
    const expiresAt = token.expiresAt ? DateTime.fromJSDate(token.expiresAt) : null;

    const provider = await Provider.findByOrFail('name', 'google_health');

    // The Health API identifies users by a `healthUserId` (from getIdentity),
    // which is what webhook notifications carry — NOT the OAuth `sub`. We store
    // it as `provider_user_id` so notifications map back like every other
    // provider. Resolve it from the fresh token via a transient (unsaved) account.
    const probe = new ProviderAccount();
    probe.accessToken = token.token;
    probe.refreshToken = token.refreshToken ?? null;
    probe.expiresAt = expiresAt;

    const healthUserId = await this.googleHealth.getHealthUserId(probe);

    if (!healthUserId) {
      session.flash(
        'error',
        'Could not read your Google Health identity. Please try connecting again.',
      );
      return response.redirect('/profile');
    }

    // Reject if this Google account is already linked to a different user —
    // the unique (provider_id, provider_user_id) constraint would 500 otherwise.
    const linkedElsewhere = await ProviderAccount.query()
      .where('provider_id', provider.id)
      .where('provider_user_id', healthUserId)
      .whereNot('user_id', user.id)
      .first();

    if (linkedElsewhere) {
      session.flash('error', 'This Google account is already connected to another user.');
      return response.redirect('/profile');
    }

    const existingAccount = await user
      .related('providerAccounts')
      .query()
      .where('provider_id', provider.id)
      .first();

    if (existingAccount) {
      existingAccount.providerUserId = healthUserId;
      existingAccount.accessToken = token.token;
      // Google only returns a refresh token on the first consent — keep the
      // stored one when it's omitted so background sync can still refresh.
      if (token.refreshToken) {
        existingAccount.refreshToken = token.refreshToken;
      }
      existingAccount.expiresAt = expiresAt;
      await existingAccount.save();
    } else {
      // First link must grant offline access, otherwise we can never refresh.
      if (!token.refreshToken) {
        session.flash('error', 'Google did not grant offline access. Please try connecting again.');
        return response.redirect('/profile');
      }

      await user.related('providerAccounts').create({
        providerId: provider.id,
        providerUserId: healthUserId,
        accessToken: token.token,
        refreshToken: token.refreshToken,
        expiresAt,
      });
    }

    // TODO: subscribe to Google Health webhooks and backfill recent data once
    // the subscription service lands.

    session.flash('success', 'Google Health connected successfully!');
    return response.redirect('/profile');
  }
}
