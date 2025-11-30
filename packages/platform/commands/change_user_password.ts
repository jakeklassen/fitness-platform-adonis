import User from '#models/user';
import { BaseCommand, args, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

export default class ChangeUserPassword extends BaseCommand {
  static commandName = 'change:user-password';
  static description = "Change a user's password";

  static options: CommandOptions = {
    startApp: true,
  };

  @args.string({ description: 'Email address of the user' })
  declare email: string;

  @flags.string({ description: 'New password (will prompt if not provided)' })
  declare password?: string;

  async run() {
    const email =
      this.email ??
      (await this.prompt.ask('Enter user email', {
        validate: (value) => {
          if (!value) return 'Email is required';
          return true;
        },
      }));

    // Find the user
    const user = await User.findBy('email', email);

    if (!user) {
      this.logger.error(`User with email "${email}" not found`);
      this.exitCode = 1;

      return;
    }

    // Get password (use flag or prompt)
    const newPassword =
      this.password ??
      (await this.prompt.secure('Enter new password', {
        validate: (value) => {
          if (!value || value.length < 8) {
            return 'Password must be at least 8 characters';
          }

          return true;
        },
      }));

    if (!newPassword) {
      this.logger.error('Password is required');
      this.exitCode = 1;

      return;
    }

    // Confirm password
    if (!this.password) {
      const confirmPassword = await this.prompt.secure('Confirm new password');

      if (newPassword !== confirmPassword) {
        this.logger.error('Passwords do not match');
        this.exitCode = 1;

        return;
      }
    }

    // Update the password
    user.password = newPassword;
    await user.save();

    this.logger.success(`Password updated successfully for ${user.email}`);
  }
}
