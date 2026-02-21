import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import Friendship from '#models/friendship';
import User from '#models/user';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

test.group('CompetitionDiscoveryController - index', () => {
  test('shows public competitions on discover page', async ({ client }) => {
    const user = await User.create({
      email: `discover-user-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Discover User',
    });

    const creator = await User.create({
      email: `discover-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Competition Creator',
    });

    await Competition.create({
      name: 'Public Challenge',
      description: 'A public step challenge',
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
    });

    const response = await client.get('/competitions/discover').loginAs(user).withInertia();

    response.assertStatus(200);
    response.assertInertiaComponent('competitions/discover');
    response.assertInertiaPropsContains({
      filters: { search: '', status: '', source: 'all' },
    });

    const props = response.inertiaProps as any;
    const competitions = props.competitions;

    const found = competitions.find((c: any) => c.competition.name === 'Public Challenge');

    if (!found) {
      throw new Error('Expected to find "Public Challenge" in discover results');
    }
  });

  test('does not show private competitions', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-private-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Private Test User',
    });

    const creator = await User.create({
      email: `discover-private-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Private Creator',
    });

    const privateName = `Private Competition ${Date.now()}`;

    await Competition.create({
      name: privateName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: creator.id,
      status: 'active',
    });

    const response = await client.get('/competitions/discover').loginAs(user).withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === privateName);

    assert.isUndefined(found);
  });

  test('does not show deleted competitions', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-deleted-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Deleted Test User',
    });

    const creator = await User.create({
      email: `discover-deleted-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Deleted Creator',
    });

    const deletedName = `Deleted Competition ${Date.now()}`;

    await Competition.create({
      name: deletedName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
      deletedAt: DateTime.now(),
    });

    const response = await client.get('/competitions/discover').loginAs(user).withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === deletedName);

    assert.isUndefined(found);
  });

  test('does not show draft competitions', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-draft-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Draft Test User',
    });

    const creator = await User.create({
      email: `discover-draft-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Draft Creator',
    });

    const draftName = `Draft Competition ${Date.now()}`;

    await Competition.create({
      name: draftName,
      startDate: DateTime.now().plus({ days: 10 }),
      endDate: DateTime.now().plus({ days: 40 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'draft',
    });

    const response = await client.get('/competitions/discover').loginAs(user).withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === draftName);

    assert.isUndefined(found);
  });

  test('filters by search term', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-search-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Search Test User',
    });

    const creator = await User.create({
      email: `discover-search-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Search Creator',
    });

    const uniqueName = `Unique Walkathon ${Date.now()}`;

    await Competition.create({
      name: uniqueName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
    });

    const response = await client
      .get('/competitions/discover')
      .qs({ search: 'Walkathon' })
      .loginAs(user)
      .withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === uniqueName);

    assert.isDefined(found);
  });

  test('filters by status', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-status-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Status Test User',
    });

    const creator = await User.create({
      email: `discover-status-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Status Creator',
    });

    const draftName = `Draft Public ${Date.now()}`;

    await Competition.create({
      name: draftName,
      startDate: DateTime.now().plus({ days: 10 }),
      endDate: DateTime.now().plus({ days: 40 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'draft',
    });

    const response = await client
      .get('/competitions/discover')
      .qs({ status: 'active' })
      .loginAs(user)
      .withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === draftName);

    assert.isUndefined(found);
  });

  test('filters by friend source', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-friend-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Friend Filter User',
    });

    const friend = await User.create({
      email: `discover-friend-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'My Friend Creator',
    });

    const stranger = await User.create({
      email: `discover-stranger-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Stranger Creator',
    });

    await Friendship.create({
      userId: user.id,
      friendId: friend.id,
      status: 'accepted',
    });

    const friendCompName = `Friend Comp ${Date.now()}`;
    const strangerCompName = `Stranger Comp ${Date.now()}`;

    await Competition.create({
      name: friendCompName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: friend.id,
      status: 'active',
    });

    await Competition.create({
      name: strangerCompName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: stranger.id,
      status: 'active',
    });

    const response = await client
      .get('/competitions/discover')
      .qs({ source: 'friends' })
      .loginAs(user)
      .withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const foundFriend = props.competitions.find((c: any) => c.competition.name === friendCompName);
    const foundStranger = props.competitions.find(
      (c: any) => c.competition.name === strangerCompName,
    );

    assert.isDefined(foundFriend);
    assert.isUndefined(foundStranger);
  });

  test('includes user membership status', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-membership-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Membership Test User',
    });

    const creator = await User.create({
      email: `discover-membership-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Membership Creator',
    });

    const compName = `Joined Competition ${Date.now()}`;

    const competition = await Competition.create({
      name: compName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
    });

    await CompetitionMember.create({
      competitionId: competition.id,
      userId: user.id,
      status: 'accepted',
      invitedBy: creator.id,
    });

    const response = await client.get('/competitions/discover').loginAs(user).withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === compName);

    assert.isDefined(found);
    assert.equal(found.userMembershipStatus, 'accepted');
  });

  test('includes member count', async ({ client, assert }) => {
    const user = await User.create({
      email: `discover-count-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Count Test User',
    });

    const creator = await User.create({
      email: `discover-count-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Count Creator',
    });

    const compName = `Count Competition ${Date.now()}`;

    const competition = await Competition.create({
      name: compName,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
    });

    await CompetitionMember.create({
      competitionId: competition.id,
      userId: creator.id,
      status: 'accepted',
      invitedBy: null,
    });

    const response = await client.get('/competitions/discover').loginAs(user).withInertia();

    response.assertStatus(200);

    const props = response.inertiaProps as any;
    const found = props.competitions.find((c: any) => c.competition.name === compName);

    assert.isDefined(found);
    assert.equal(found.memberCount, 1);
  });

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/competitions/discover').redirects(0);

    response.assertStatus(302);
  });
});

test.group('CompetitionDiscoveryController - join', () => {
  test('user can join a public competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `join-user-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Join User',
    });

    const creator = await User.create({
      email: `join-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Join Creator',
    });

    const competition = await Competition.create({
      name: `Join Test ${Date.now()}`,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
    });

    const response = await client
      .post(`/competitions/${competition.id}/join`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);
    response.assertHeader('location', `/competitions/${competition.id}`);

    const membership = await CompetitionMember.query()
      .where('competition_id', competition.id)
      .where('user_id', user.id)
      .firstOrFail();

    assert.equal(membership.status, 'accepted');
    assert.isNull(membership.invitedBy);
  });

  test('cannot join a private competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `join-private-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Private Join User',
    });

    const creator = await User.create({
      email: `join-private-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Private Join Creator',
    });

    const competition = await Competition.create({
      name: `Private Join Test ${Date.now()}`,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: creator.id,
      status: 'active',
    });

    const response = await client
      .post(`/competitions/${competition.id}/join`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);

    const membership = await CompetitionMember.query()
      .where('competition_id', competition.id)
      .where('user_id', user.id)
      .first();

    assert.isNull(membership);
  });

  test('cannot join a competition twice', async ({ client, assert }) => {
    const user = await User.create({
      email: `join-twice-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Twice Join User',
    });

    const creator = await User.create({
      email: `join-twice-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Twice Join Creator',
    });

    const competition = await Competition.create({
      name: `Twice Join Test ${Date.now()}`,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
    });

    await CompetitionMember.create({
      competitionId: competition.id,
      userId: user.id,
      status: 'accepted',
      invitedBy: null,
    });

    const response = await client
      .post(`/competitions/${competition.id}/join`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);

    const memberships = await CompetitionMember.query()
      .where('competition_id', competition.id)
      .where('user_id', user.id);

    assert.equal(memberships.length, 1);
  });

  test('cannot join a draft competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `join-draft-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Draft Join User',
    });

    const creator = await User.create({
      email: `join-draft-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Draft Join Creator',
    });

    const competition = await Competition.create({
      name: `Draft Join Test ${Date.now()}`,
      startDate: DateTime.now().plus({ days: 10 }),
      endDate: DateTime.now().plus({ days: 40 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'draft',
    });

    const response = await client
      .post(`/competitions/${competition.id}/join`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);

    const membership = await CompetitionMember.query()
      .where('competition_id', competition.id)
      .where('user_id', user.id)
      .first();

    assert.isNull(membership);
  });

  test('cannot join a deleted competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `join-deleted-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Deleted Join User',
    });

    const creator = await User.create({
      email: `join-deleted-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Deleted Join Creator',
    });

    const competition = await Competition.create({
      name: `Deleted Join Test ${Date.now()}`,
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'public',
      createdBy: creator.id,
      status: 'active',
      deletedAt: DateTime.now(),
    });

    const response = await client
      .post(`/competitions/${competition.id}/join`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(404);

    const membership = await CompetitionMember.query()
      .where('competition_id', competition.id)
      .where('user_id', user.id)
      .first();

    assert.isNull(membership);
  });

  test('join requires authentication', async ({ client }) => {
    const response = await client.post('/competitions/1/join').redirects(0);

    response.assertStatus(302);
  });
});
