import Friendship from '#models/friendship';
import User from '#models/user';
import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';

test.group('AuthController - auto-friend seeded users', (group) => {
  let originalInDev: boolean;

  group.each.setup(() => {
    originalInDev = app.inDev;
  });

  group.each.teardown(() => {
    Object.defineProperty(app, 'inDev', {
      get: () => originalInDev,
      configurable: true,
    });
  });

  test('creates accepted friendships with @example.com users in dev mode', async ({
    client,
    assert,
  }) => {
    Object.defineProperty(app, 'inDev', {
      get: () => true,
      configurable: true,
    });

    const timestamp = Date.now();

    const seededUser1 = await User.create({
      email: `seeded1-${timestamp}@example.com`,
      password: 'password123',
      fullName: 'Seeded User 1',
    });

    const seededUser2 = await User.create({
      email: `seeded2-${timestamp}@example.com`,
      password: 'password123',
      fullName: 'Seeded User 2',
    });

    // Non-example.com user should never be auto-friended
    const nonSeededUser = await User.create({
      email: `other-${timestamp}@gmail.com`,
      password: 'password123',
      fullName: 'Non-Seeded User',
    });

    // Seed Math.random to always return < 0.65 so all seeded users are selected
    const originalRandom = Math.random;
    Math.random = () => 0.3;

    try {
      const response = await client
        .post('/register')
        .withCsrfToken()
        .form({
          fullName: 'New User',
          email: `newuser-${timestamp}@test.com`,
          password: 'password123',
        })
        .redirects(0);

      response.assertStatus(302);

      const newUser = await User.findByOrFail('email', `newuser-${timestamp}@test.com`);

      const friendships = await Friendship.query().where('user_id', newUser.id);

      const friendIds = friendships.map((f) => f.friendId);

      // Should include both seeded @example.com users
      assert.includeMembers(friendIds, [seededUser1.id, seededUser2.id]);

      // Should NOT include non-example.com user
      assert.notInclude(friendIds, nonSeededUser.id);

      // All friendships should be accepted
      for (const friendship of friendships) {
        assert.equal(friendship.status, 'accepted');
      }

      // Verify all friends are @example.com users
      const friendUsers = await User.query().whereIn('id', friendIds);

      for (const friendUser of friendUsers) {
        assert.match(friendUser.email, /@example\.com$/);
      }
    } finally {
      Math.random = originalRandom;
    }
  });

  test('does not create friendships when not in dev mode', async ({ client, assert }) => {
    Object.defineProperty(app, 'inDev', {
      get: () => false,
      configurable: true,
    });

    const timestamp = Date.now();

    await User.create({
      email: `seeded-nodev-${timestamp}@example.com`,
      password: 'password123',
      fullName: 'Seeded No Dev',
    });

    const response = await client
      .post('/register')
      .withCsrfToken()
      .form({
        fullName: 'Another User',
        email: `nodev-${timestamp}@test.com`,
        password: 'password123',
      })
      .redirects(0);

    response.assertStatus(302);

    const newUser = await User.findByOrFail('email', `nodev-${timestamp}@test.com`);

    const friendships = await Friendship.query().where('user_id', newUser.id);

    assert.lengthOf(friendships, 0);
  });

  test('only selects a subset of seeded users based on random chance', async ({
    client,
    assert,
  }) => {
    Object.defineProperty(app, 'inDev', {
      get: () => true,
      configurable: true,
    });

    const timestamp = Date.now();

    await User.create({
      email: `subset-a-${timestamp}@example.com`,
      password: 'password123',
      fullName: 'Subset A',
    });

    await User.create({
      email: `subset-b-${timestamp}@example.com`,
      password: 'password123',
      fullName: 'Subset B',
    });

    // Make Math.random return values that exclude all users (>= 0.65)
    const originalRandom = Math.random;
    Math.random = () => 0.9;

    try {
      const response = await client
        .post('/register')
        .withCsrfToken()
        .form({
          fullName: 'Subset Test User',
          email: `subset-test-${timestamp}@test.com`,
          password: 'password123',
        })
        .redirects(0);

      response.assertStatus(302);

      const newUser = await User.findByOrFail('email', `subset-test-${timestamp}@test.com`);

      const friendships = await Friendship.query().where('user_id', newUser.id);

      assert.lengthOf(friendships, 0);
    } finally {
      Math.random = originalRandom;
    }
  });
});
