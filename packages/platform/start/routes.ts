/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';

const AuthController = () => import('#controllers/auth_controller');
const ProfilesController = () => import('#controllers/profiles_controller');
const FitbitController = () => import('#controllers/fitbit_controller');
const FriendsController = () => import('#controllers/friends_controller');
const CompetitionsController = () => import('#controllers/competitions_controller');
const FitbitWebhookController = () => import('#controllers/fitbit_webhook_controller');

// FitBit webhook routes (public, no auth/CSRF)
router.get('/webhooks/fitbit', [FitbitWebhookController, 'verify']).as('webhooks.fitbit.verify');
router
  .post('/webhooks/fitbit', [FitbitWebhookController, 'handleNotification'])
  .as('webhooks.fitbit.notify');

// Home - accessible to both guests and authenticated users
router.on('/').renderInertia('home').use(middleware.silentAuth());

// Guest routes (not authenticated)
router
  .group(() => {
    router.get('/register', [AuthController, 'showRegister']).as('auth.register.show');
    router.post('/register', [AuthController, 'register']).as('auth.register');
    router.get('/login', [AuthController, 'showLogin']).as('auth.login.show');
    router.post('/login', [AuthController, 'login']).as('auth.login');
  })
  .use(middleware.guest());

// Authenticated routes
router
  .group(() => {
    router.post('/logout', [AuthController, 'logout']).as('auth.logout');
    router.get('/profile', [ProfilesController, 'show']).as('profile.show');
    router
      .delete('/profile/accounts/:id', [ProfilesController, 'unlinkAccount'])
      .as('profile.accounts.unlink');
    router
      .post('/profile/set-preferred-provider', [ProfilesController, 'setPreferredProvider'])
      .as('profile.set-preferred-provider');

    // Fitbit OAuth
    router.get('/auth/fitbit', [FitbitController, 'redirect']).as('fitbit.redirect');
    router.get('/auth/fitbit/callback', [FitbitController, 'callback']).as('fitbit.callback');

    // Friends
    router.get('/friends', [FriendsController, 'index']).as('friends.index');
    router.get('/friends/add', [FriendsController, 'create']).as('friends.create');
    router.post('/friends/search', [FriendsController, 'search']).as('friends.search');
    router.post('/friends/:userId', [FriendsController, 'store']).as('friends.store');
    router.post('/friends/:id/accept', [FriendsController, 'accept']).as('friends.accept');
    router.post('/friends/:id/decline', [FriendsController, 'decline']).as('friends.decline');
    router.delete('/friends/:id', [FriendsController, 'destroy']).as('friends.destroy');

    // Competitions
    router.get('/competitions', [CompetitionsController, 'index']).as('competitions.index');
    router
      .get('/competitions/create', [CompetitionsController, 'create'])
      .as('competitions.create');
    router.post('/competitions', [CompetitionsController, 'store']).as('competitions.store');
    router.get('/competitions/:id', [CompetitionsController, 'show']).as('competitions.show');
    router.get('/competitions/:id/edit', [CompetitionsController, 'edit']).as('competitions.edit');
    router.put('/competitions/:id', [CompetitionsController, 'update']).as('competitions.update');
    router
      .delete('/competitions/:id', [CompetitionsController, 'destroy'])
      .as('competitions.destroy');

    // Competition invitations
    router
      .get('/competitions/:id/invite', [CompetitionsController, 'inviteForm'])
      .as('competitions.invite.form');
    router
      .post('/competitions/:id/invite', [CompetitionsController, 'invite'])
      .as('competitions.invite');
    router
      .post('/competitions/:id/accept', [CompetitionsController, 'accept'])
      .as('competitions.accept');
    router
      .post('/competitions/:id/decline', [CompetitionsController, 'decline'])
      .as('competitions.decline');
  })
  .use(middleware.auth());
