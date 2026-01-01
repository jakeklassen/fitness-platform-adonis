import { FitbitUserDto } from '#dtos/fitbit_user_dto';
import { ProviderAccountDto } from '#dtos/provider_account_dto';
import { UserDto } from '#dtos/user_dto';
import ProviderAccount from '#models/provider_account';
import { FitbitService } from '#services/fitbit_service';
import type { HttpContext } from '@adonisjs/core/http';

export default class ProfilesController {
  /**
   * Show the user's profile with linked accounts
   */
  async show({ auth, inertia, ally }: HttpContext) {
    const user = auth.getUserOrFail();
    await user.load('accounts', (query) => {
      query.preload('provider');
    });

    const fitbitAccount = user.accounts.find((account) => account.provider.name === 'fitbit');

    // Fetch Fitbit user data if account is linked
    const fitbitService = new FitbitService(ally);
    const fitbitData = await fitbitService.getUserData(fitbitAccount);
    const fitbitUserData = fitbitData ? new FitbitUserDto(fitbitData).toJson() : null;

    // Fetch devices for each account and build connected accounts array
    const accountsWithDevices = await Promise.all(
      Array.from(user.accounts).map(async (account) => {
        const accountDto = new ProviderAccountDto(account).toJson();
        let devices: any[] = [];

        // Only fetch devices for Fitbit accounts for now
        if (account.provider.name === 'fitbit') {
          devices = (await fitbitService.getDevices(account)) || [];
        }

        return {
          ...accountDto,
          devices,
        };
      }),
    );

    // Set default preferred provider to first provider if not already set
    if (!user.preferredStepsProviderId && accountsWithDevices.length > 0) {
      user.preferredStepsProviderId = user.accounts[0].providerId;
      await user.save();
    }

    // Load the preferred provider if set
    await user.load('preferredStepsProvider');

    return inertia.render('profile', {
      user: new UserDto(user).toJson(),
      accounts: accountsWithDevices,
      fitbitUserData,
      preferredProvider: user.preferredStepsProvider?.name ?? null,
    });
  }

  /**
   * Unlink an account
   */
  async unlinkAccount({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();

    const account = await ProviderAccount.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .preload('provider')
      .firstOrFail();

    const providerName = account.provider.displayName;

    await account.delete();

    session.flash('success', `${providerName} account disconnected successfully`);

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
    const account = await ProviderAccount.query()
      .where('user_id', user.id)
      .whereHas('provider', (query) => {
        query.where('name', provider);
      })
      .preload('provider')
      .first();

    if (!account) {
      session.flash('error', 'You do not have this provider connected');
      return response.redirect('/profile');
    }

    user.preferredStepsProviderId = account.providerId;
    await user.save();

    session.flash('success', `${account.provider.displayName} set as preferred provider`);

    return response.redirect('/profile');
  }
}
