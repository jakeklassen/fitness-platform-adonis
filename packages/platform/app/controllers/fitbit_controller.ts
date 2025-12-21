import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

export default class FitbitController {
  /**
   * Redirect to Fitbit for authorization
   */
  async redirect({ ally }: HttpContext) {
    return ally.use('fitbit').redirect((request) => {
      request.scopes(['profile', 'activity', 'heartrate', 'sleep', 'settings']);
    });
  }

  /**
   * Handle the callback from Fitbit
   */
  async callback({ ally, auth, response, session }: HttpContext) {
    const fitbit = ally.use('fitbit');

    /**
     * Handle user denying access
     */
    if (fitbit.accessDenied()) {
      session.flash('error', 'You denied access to your Fitbit account');
      return response.redirect('/profile');
    }

    /**
     * Handle errors during authorization
     */
    if (fitbit.stateMisMatch()) {
      session.flash('error', 'Invalid state. Please try again.');
      return response.redirect('/profile');
    }

    if (fitbit.hasError()) {
      session.flash('error', fitbit.getError() || 'An error occurred during authorization');
      return response.redirect('/profile');
    }

    const user = auth.getUserOrFail();
    const fitbitUser = await fitbit.user();

    /**
     * Check if this Fitbit account is already linked to another user
     */
    const existingAccount = await user
      .related('accounts')
      .query()
      .where('provider', 'fitbit')
      .first();

    if (existingAccount) {
      // Update the existing account
      existingAccount.providerId = fitbitUser.id;
      existingAccount.accessToken = fitbitUser.token.token;
      existingAccount.refreshToken = fitbitUser.token.refreshToken || null;
      existingAccount.expiresAt = fitbitUser.token.expiresAt
        ? DateTime.fromJSDate(fitbitUser.token.expiresAt)
        : null;
      await existingAccount.save();
    } else {
      // Create a new account link
      await user.related('accounts').create({
        provider: 'fitbit',
        providerId: fitbitUser.id,
        accessToken: fitbitUser.token.token,
        refreshToken: fitbitUser.token.refreshToken || null,
        expiresAt: fitbitUser.token.expiresAt
          ? DateTime.fromJSDate(fitbitUser.token.expiresAt)
          : null,
      });
    }

    session.flash('success', 'Fitbit account linked successfully!');
    return response.redirect('/profile');
  }
}
