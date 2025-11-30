import User from '#models/user';
import { loginValidator } from '#validators/auth/login';
import { registerValidator } from '#validators/auth/register';
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
    const { email, password } = await request.validateUsing(loginValidator);

    try {
      const user = await User.verifyCredentials(email, password);
      await auth.use('web').login(user);

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
