import Friendship from '#models/friendship';
import User from '#models/user';
import { loginValidator } from '#validators/auth/login';
import { registerValidator } from '#validators/auth/register';
import app from '@adonisjs/core/services/app';
import type { HttpContext } from '@adonisjs/core/http';

export default class AuthController {
  /**
   * Show the registration page
   */
  async showRegister({ inertia }: HttpContext) {
    return inertia.render('auth/register');
  }

  /**
   * Handle user registration
   */
  async register({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator);

    const user = await User.create(data);

    if (app.inDev) {
      const seededUsers = await User.query().where('email', 'like', '%@example.com');

      const selectedUsers = seededUsers.filter(() => Math.random() < 0.65);

      if (selectedUsers.length > 0) {
        await Friendship.createMany(
          selectedUsers.map((seededUser) => ({
            userId: user.id,
            friendId: seededUser.id,
            status: 'accepted' as const,
          })),
        );
      }
    }

    await auth.use('web').login(user);

    return response.redirect('/profile');
  }

  /**
   * Show the login page
   */
  async showLogin({ inertia }: HttpContext) {
    return inertia.render('auth/login');
  }

  /**
   * Handle user login
   */
  async login({ request, auth, response, session }: HttpContext) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator);

    try {
      const user = await User.verifyCredentials(email, password);
      await auth.use('web').login(user, Boolean(rememberMe));

      return response.redirect('/profile');
    } catch (error) {
      session.flash('error', 'Invalid email or password');
      return response.redirect().back();
    }
  }

  /**
   * Handle user logout
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout();
    return response.redirect('/login');
  }
}
