import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import User from '#models/user';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

test.group('CompetitionsController - launch', () => {
  test('creator can launch a draft competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `launch-creator-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Launch Creator',
    });

    const competition = await Competition.create({
      name: 'Draft Competition',
      startDate: DateTime.now().plus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: user.id,
      status: 'draft',
    });

    await CompetitionMember.create({
      competitionId: competition.id,
      userId: user.id,
      status: 'accepted',
      invitedBy: null,
    });

    const response = await client
      .post(`/competitions/${competition.id}/launch`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);
    response.assertHeader('location', `/competitions/${competition.id}`);

    await competition.refresh();
    assert.equal(competition.status, 'active');
  });

  test('non-creator cannot launch a competition', async ({ client, assert }) => {
    const creator = await User.create({
      email: `launch-owner-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Competition Owner',
    });

    const otherUser = await User.create({
      email: `launch-other-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Other User',
    });

    const competition = await Competition.create({
      name: 'Not My Competition',
      startDate: DateTime.now().plus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: creator.id,
      status: 'draft',
    });

    const response = await client
      .post(`/competitions/${competition.id}/launch`)
      .withCsrfToken()
      .loginAs(otherUser)
      .redirects(0);

    response.assertStatus(302);

    await competition.refresh();
    assert.equal(competition.status, 'draft');
  });

  test('cannot launch an already active competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `launch-active-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Active Comp User',
    });

    const competition = await Competition.create({
      name: 'Active Competition',
      startDate: DateTime.now().minus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: user.id,
      status: 'active',
    });

    const response = await client
      .post(`/competitions/${competition.id}/launch`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);

    await competition.refresh();
    assert.equal(competition.status, 'active');
  });

  test('cannot launch an ended competition', async ({ client, assert }) => {
    const user = await User.create({
      email: `launch-ended-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Ended Comp User',
    });

    const competition = await Competition.create({
      name: 'Ended Competition',
      startDate: DateTime.now().minus({ days: 60 }),
      endDate: DateTime.now().minus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: user.id,
      status: 'ended',
    });

    const response = await client
      .post(`/competitions/${competition.id}/launch`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(302);

    await competition.refresh();
    assert.equal(competition.status, 'ended');
  });

  test('cannot launch a deleted competition', async ({ client }) => {
    const user = await User.create({
      email: `launch-deleted-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Deleted Comp User',
    });

    const competition = await Competition.create({
      name: 'Deleted Competition',
      startDate: DateTime.now().plus({ days: 1 }),
      endDate: DateTime.now().plus({ days: 30 }),
      goalType: 'total_steps',
      visibility: 'private',
      createdBy: user.id,
      status: 'draft',
      deletedAt: DateTime.now(),
    });

    const response = await client
      .post(`/competitions/${competition.id}/launch`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0);

    response.assertStatus(404);
  });
});
