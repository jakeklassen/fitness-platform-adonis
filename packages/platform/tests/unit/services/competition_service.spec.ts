import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import DailyStep from '#models/daily_step';
import User from '#models/user';
import { CompetitionService } from '#services/competition_service';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

async function createTestUser(overrides: Partial<{ email: string; fullName: string }> = {}) {
  return User.create({
    email: overrides.email ?? `test-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    fullName: overrides.fullName ?? 'Test User',
  });
}

async function createCompetition(
  creator: User,
  overrides: Partial<{
    startDate: DateTime;
    endDate: DateTime;
    status: 'draft' | 'active' | 'ended';
  }> = {},
) {
  const competition = await Competition.create({
    name: `Test Competition ${Date.now()}`,
    startDate: overrides.startDate ?? DateTime.now().minus({ days: 10 }),
    endDate: overrides.endDate ?? DateTime.now().plus({ days: 18 }),
    goalType: 'total_steps',
    createdBy: creator.id,
    status: overrides.status ?? 'active',
    visibility: 'private',
  });

  await CompetitionMember.create({
    competitionId: competition.id,
    userId: creator.id,
    status: 'accepted',
    invitedBy: null,
  });

  return competition;
}

test.group('CompetitionService - getCompetitionStats', () => {
  test('averageSteps is total steps divided by participant count', async ({ assert }) => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    const startDate = DateTime.now().minus({ days: 5 });
    const competition = await createCompetition(user1, { startDate });

    await CompetitionMember.create({
      competitionId: competition.id,
      userId: user2.id,
      status: 'accepted',
      invitedBy: user1.id,
    });

    // User 1: 60,000 total
    for (let i = 0; i < 5; i++) {
      await DailyStep.create({
        userId: user1.id,
        date: startDate.plus({ days: i }),
        steps: 12_000,
      });
    }

    // User 2: 40,000 total
    for (let i = 0; i < 5; i++) {
      await DailyStep.create({
        userId: user2.id,
        date: startDate.plus({ days: i }),
        steps: 8_000,
      });
    }

    const service = new CompetitionService();
    const stats = await service.getCompetitionStats(competition.id, user1.id);

    // (60,000 + 40,000) / 2 participants = 50,000
    assert.equal(stats.averageSteps, 50_000);
    assert.equal(stats.totalParticipants, 2);
    assert.equal(stats.activeParticipants, 2);
  });

  test('averageSteps is 0 when no steps recorded', async ({ assert }) => {
    const user = await createTestUser();

    const competition = await createCompetition(user, {
      startDate: DateTime.now().minus({ days: 5 }),
      endDate: DateTime.now().plus({ days: 25 }),
    });

    const service = new CompetitionService();
    const stats = await service.getCompetitionStats(competition.id, user.id);

    assert.equal(stats.averageSteps, 0);
    assert.equal(stats.activeParticipants, 0);
  });
});

test.group('CompetitionService - leaderboard dailyAverage', () => {
  test('dailyAverage is participant total steps divided by elapsed days', async ({ assert }) => {
    const user = await createTestUser();

    const startDate = DateTime.now().minus({ days: 10 });
    const competition = await createCompetition(user, { startDate });

    // 10 days × 10,000 = 100,000 total
    for (let i = 0; i < 10; i++) {
      await DailyStep.create({
        userId: user.id,
        date: startDate.plus({ days: i }),
        steps: 10_000,
      });
    }

    const service = new CompetitionService();
    const stats = await service.getCompetitionStats(competition.id, user.id);
    const entry = stats.leaderboard.find((e) => e.userId === user.id)!;

    const elapsedDays = Math.ceil(DateTime.now().diff(startDate, 'days').days);
    const expectedDailyAvg = Math.round(100_000 / elapsedDays);

    assert.equal(entry.dailyAverage, expectedDailyAvg);
    assert.notEqual(entry.dailyAverage, entry.totalSteps, 'Daily avg should differ from total');
  });

  test('dailyAverage for ended competition uses end date not today', async ({ assert }) => {
    const user = await createTestUser();

    const startDate = DateTime.now().minus({ days: 30 });
    const endDate = DateTime.now().minus({ days: 2 });
    const competition = await createCompetition(user, { startDate, endDate, status: 'ended' });

    const totalDays = Math.ceil(endDate.diff(startDate, 'days').days);

    for (let i = 0; i < totalDays; i++) {
      await DailyStep.create({
        userId: user.id,
        date: startDate.plus({ days: i }),
        steps: 10_000,
      });
    }

    const service = new CompetitionService();
    const stats = await service.getCompetitionStats(competition.id, user.id);
    const entry = stats.leaderboard.find((e) => e.userId === user.id)!;

    assert.equal(entry.dailyAverage, 10_000);
  });

  test('dailyAverage on first day uses minimum 1 day divisor', async ({ assert }) => {
    const user = await createTestUser();

    const competition = await createCompetition(user, {
      startDate: DateTime.now(),
      endDate: DateTime.now().plus({ days: 28 }),
    });

    await DailyStep.create({
      userId: user.id,
      date: DateTime.now(),
      steps: 15_000,
    });

    const service = new CompetitionService();
    const stats = await service.getCompetitionStats(competition.id, user.id);
    const entry = stats.leaderboard.find((e) => e.userId === user.id)!;

    assert.equal(entry.dailyAverage, 15_000);
  });

  test('each participant has their own dailyAverage', async ({ assert }) => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    const startDate = DateTime.now().minus({ days: 10 });
    const competition = await createCompetition(user1, { startDate });

    await CompetitionMember.create({
      competitionId: competition.id,
      userId: user2.id,
      status: 'accepted',
      invitedBy: user1.id,
    });

    // User 1: 120,000 total
    for (let i = 0; i < 10; i++) {
      await DailyStep.create({
        userId: user1.id,
        date: startDate.plus({ days: i }),
        steps: 12_000,
      });
    }

    // User 2: 50,000 total
    for (let i = 0; i < 10; i++) {
      await DailyStep.create({
        userId: user2.id,
        date: startDate.plus({ days: i }),
        steps: 5_000,
      });
    }

    const service = new CompetitionService();
    const stats = await service.getCompetitionStats(competition.id, user1.id);

    const entry1 = stats.leaderboard.find((e) => e.userId === user1.id)!;
    const entry2 = stats.leaderboard.find((e) => e.userId === user2.id)!;

    const elapsedDays = Math.ceil(DateTime.now().diff(startDate, 'days').days);

    assert.equal(entry1.dailyAverage, Math.round(120_000 / elapsedDays));
    assert.equal(entry2.dailyAverage, Math.round(50_000 / elapsedDays));
    assert.isAbove(entry1.dailyAverage, entry2.dailyAverage);
  });
});
