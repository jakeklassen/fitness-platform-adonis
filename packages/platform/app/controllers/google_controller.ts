import Provider from '#models/provider';
import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

export default class GoogleController {
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

    const provider = await Provider.findByOrFail('name', 'google_health');

    const existingAccount = await user
      .related('providerAccounts')
      .query()
      .where('provider_id', provider.id)
      .first();

    if (existingAccount) {
      existingAccount.providerUserId = googleUser.id;
      existingAccount.accessToken = googleUser.token.token;
      existingAccount.refreshToken = googleUser.token.refreshToken || null;
      existingAccount.expiresAt = googleUser.token.expiresAt
        ? DateTime.fromJSDate(googleUser.token.expiresAt)
        : null;
      await existingAccount.save();
    } else {
      await user.related('providerAccounts').create({
        providerId: provider.id,
        providerUserId: googleUser.id,
        accessToken: googleUser.token.token,
        refreshToken: googleUser.token.refreshToken || null,
        expiresAt: googleUser.token.expiresAt
          ? DateTime.fromJSDate(googleUser.token.expiresAt)
          : null,
      });
    }

    // TODO: subscribe to Google Health webhooks and backfill recent data once
    // the Google Health subscription + reads services land.

    session.flash('success', 'Google Health connected successfully!');
    return response.redirect('/profile');
  }
}
