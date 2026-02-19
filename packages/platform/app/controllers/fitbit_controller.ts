import Provider from '#models/provider';
import { FitbitSubscriptionService } from '#services/fitbit_subscription_service';
import type { HttpContext } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger';
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

    // Get the Fitbit provider
    const fitbitProvider = await Provider.findByOrFail('name', 'fitbit');

    /**
     * Check if this Fitbit account is already linked to this user
     */
    const existingAccount = await user
      .related('providerAccounts')
      .query()
      .where('provider_id', fitbitProvider.id)
      .first();

    let account;

    if (existingAccount) {
      // Update the existing account
      existingAccount.providerUserId = fitbitUser.id;
      existingAccount.accessToken = fitbitUser.token.token;
      existingAccount.refreshToken = fitbitUser.token.refreshToken || null;
      existingAccount.expiresAt = fitbitUser.token.expiresAt
        ? DateTime.fromJSDate(fitbitUser.token.expiresAt)
        : null;
      await existingAccount.save();
      account = existingAccount;
    } else {
      // Create a new account link
      account = await user.related('providerAccounts').create({
        providerId: fitbitProvider.id,
        providerUserId: fitbitUser.id,
        accessToken: fitbitUser.token.token,
        refreshToken: fitbitUser.token.refreshToken || null,
        expiresAt: fitbitUser.token.expiresAt
          ? DateTime.fromJSDate(fitbitUser.token.expiresAt)
          : null,
      });
    }

    // Auto-subscribe to FitBit activity notifications (fire-and-forget)
    try {
      const subscriptionService = new FitbitSubscriptionService();
      await subscriptionService.createSubscription(account, 'activities');
    } catch (error) {
      logger.error({ err: error }, 'Failed to auto-subscribe to FitBit notifications');
    }

    session.flash('success', 'Fitbit account linked successfully!');
    return response.redirect('/profile');
  }
}
