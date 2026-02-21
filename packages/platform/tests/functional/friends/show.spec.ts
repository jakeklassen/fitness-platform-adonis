import DailyStep from '#models/daily_step';
import Friendship from '#models/friendship';
import User from '#models/user';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

test.group('FriendsController - show', () => {
  test('accepted friend can view profile', async ({ client }) => {
    const timestamp = Date.now();

    const user = await User.create({
      email: `viewer-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Viewer User',
    });

    const friend = await User.create({
      email: `friend-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Friend User',
    });

    await Friendship.create({
      userId: user.id,
      friendId: friend.id,
      status: 'accepted',
    });

    const response = await client.get(`/friends/${friend.id}`).loginAs(user).withInertia();

    response.assertStatus(200);
    response.assertInertiaComponent('friends/show');
    response.assertInertiaPropsContains({
      friend: { id: friend.id, fullName: 'Friend User' },
    });
  });

  test('non-friend cannot view profile', async ({ client, assert }) => {
    const timestamp = Date.now();

    const user = await User.create({
      email: `nonfriend-viewer-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Non Friend Viewer',
    });

    const stranger = await User.create({
      email: `stranger-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Stranger',
    });

    const response = await client.get(`/friends/${stranger.id}`).loginAs(user).redirects(0);

    response.assertStatus(302);

    const location = response.header('location') ?? '';
    assert.isTrue(location.endsWith('/friends'));
  });

  test('pending friendship is denied access', async ({ client, assert }) => {
    const timestamp = Date.now();

    const user = await User.create({
      email: `pending-viewer-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Pending Viewer',
    });

    const pendingFriend = await User.create({
      email: `pending-friend-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Pending Friend',
    });

    await Friendship.create({
      userId: user.id,
      friendId: pendingFriend.id,
      status: 'pending',
    });

    const response = await client.get(`/friends/${pendingFriend.id}`).loginAs(user).redirects(0);

    response.assertStatus(302);

    const location = response.header('location') ?? '';
    assert.isTrue(location.endsWith('/friends'));
  });

  test('reverse friendship direction works', async ({ client }) => {
    const timestamp = Date.now();

    const user = await User.create({
      email: `reverse-viewer-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Reverse Viewer',
    });

    const friend = await User.create({
      email: `reverse-friend-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Reverse Friend',
    });

    // Friend initiated the friendship, not the viewer
    await Friendship.create({
      userId: friend.id,
      friendId: user.id,
      status: 'accepted',
    });

    const response = await client.get(`/friends/${friend.id}`).loginAs(user).withInertia();

    response.assertStatus(200);
    response.assertInertiaComponent('friends/show');
    response.assertInertiaPropsContains({
      friend: { id: friend.id, fullName: 'Reverse Friend' },
    });
  });

  test('email is not exposed in friend profile', async ({ client, assert }) => {
    const timestamp = Date.now();

    const user = await User.create({
      email: `email-check-viewer-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Email Check Viewer',
    });

    const friend = await User.create({
      email: `secret-email-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Secret Email Friend',
    });

    await Friendship.create({
      userId: user.id,
      friendId: friend.id,
      status: 'accepted',
    });

    const response = await client.get(`/friends/${friend.id}`).loginAs(user).withInertia();

    response.assertStatus(200);

    const body = JSON.stringify(response.body());
    assert.notInclude(body, `secret-email-${timestamp}@test.com`);
  });

  test('unauthenticated user is redirected', async ({ client }) => {
    const timestamp = Date.now();

    const friend = await User.create({
      email: `unauth-friend-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Unauth Friend',
    });

    const response = await client.get(`/friends/${friend.id}`).redirects(0);

    response.assertStatus(302);
  });

  test('step stats are returned correctly', async ({ client, assert }) => {
    const timestamp = Date.now();

    const user = await User.create({
      email: `stats-viewer-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Stats Viewer',
    });

    const friend = await User.create({
      email: `stats-friend-${timestamp}@test.com`,
      password: 'password123',
      fullName: 'Stats Friend',
    });

    await Friendship.create({
      userId: user.id,
      friendId: friend.id,
      status: 'accepted',
    });

    const today = DateTime.now().startOf('day');

    // Create step records for today and yesterday
    await DailyStep.create({
      userId: friend.id,
      date: today,
      steps: 10000,
    });

    await DailyStep.create({
      userId: friend.id,
      date: today.minus({ days: 1 }),
      steps: 8000,
    });

    const response = await client.get(`/friends/${friend.id}`).loginAs(user).withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as {
      stats: {
        todaySteps: number;
        total30Days: number;
        dailyAverage: number;
        last7Days: { date: string; steps: number }[];
      };
    };

    assert.equal(props.stats.todaySteps, 10000);
    assert.equal(props.stats.total30Days, 18000);
    assert.equal(props.stats.dailyAverage, Math.round(18000 / 30));
    assert.lengthOf(props.stats.last7Days, 7);
  });
});
