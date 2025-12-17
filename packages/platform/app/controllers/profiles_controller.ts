import { AccountDto } from '#dtos/account_dto';
import { FitbitUserDto } from '#dtos/fitbit_user_dto';
import { UserDto } from '#dtos/user_dto';
import Account from '#models/account';
import { FitbitService } from '#services/fitbit_service';
import type { HttpContext } from '@adonisjs/core/http';

export default class ProfilesController {
  /**
   * Show the user's profile with linked accounts
   */
  async show({ auth, inertia, ally }: HttpContext) {
    const user = auth.getUserOrFail();
    await user.load('accounts');

    const fitbitAccount = user.accounts.find((account) => account.provider === 'fitbit');

    // Fetch Fitbit user data if account is linked
    const fitbitService = new FitbitService(ally);
    const fitbitData = await fitbitService.getUserData(fitbitAccount);
    const fitbitUserData = fitbitData ? new FitbitUserDto(fitbitData).toJson() : null;

    // Fetch devices for each account and build connected accounts array
    const accountsWithDevices = await Promise.all(
      Array.from(user.accounts).map(async (account) => {
        const accountDto = new AccountDto(account).toJson();
        let devices = [];

        // Only fetch devices for Fitbit accounts for now
        if (account.provider === 'fitbit') {
          devices = await fitbitService.getDevices(account);
        }

        return {
          ...accountDto,
          devices,
        };
      }),
    );

    // Set default preferred provider to first provider if not already set
    if (!user.preferredStepsProvider && accountsWithDevices.length > 0) {
      user.preferredStepsProvider = accountsWithDevices[0].provider;
      await user.save();
    }

    return inertia.render('profile', {
      user: new UserDto(user).toJson(),
      accounts: accountsWithDevices,
      fitbitUserData,
      preferredProvider: user.preferredStepsProvider,
    });
  }

  /**
   * Unlink an account
   */
  async unlinkAccount({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();

    const account = await Account.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail();

    const provider = account.provider;

    await account.delete();

    session.flash(
      'success',
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected successfully`,
    );

    return response.redirect('/profile');
  }

  /**
   * Set the user's preferred fitness tracker provider.
   * This provider's data will be used when multiple accounts are connected.
   */
  async setPreferredProvider({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const { provider } = request.only(['provider']);

    // Verify user has this provider connected
    const hasProvider = await Account.query()
      .where('user_id', user.id)
      .where('provider', provider)
      .first();

    if (!hasProvider) {
      session.flash('error', 'You do not have this provider connected');
      return response.redirect('/profile');
    }

    user.preferredStepsProvider = provider;
    await user.save();

    session.flash(
      'success',
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} set as preferred provider`,
    );

    return response.redirect('/profile');
  }
}
