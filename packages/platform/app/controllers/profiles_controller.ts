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

    // NOTE: Array.from is used
    const accounts = Array.from(user.accounts).map((account) => new AccountDto(account).toJson());

    return inertia.render('profile', {
      user: new UserDto(user).toJson(),
      accounts,
      fitbitUserData,
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
}
