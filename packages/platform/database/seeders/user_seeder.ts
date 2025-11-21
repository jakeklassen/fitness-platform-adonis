import User from '#models/user';
import DailyStep from '#models/daily_step';
import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { DateTime } from 'luxon';

export default class extends BaseSeeder {
  async run() {
    // Create test users
    const users = await User.createMany([
      {
        email: 'alice@example.com',
        password: 'password123',
        fullName: 'Alice Johnson',
      },
      {
        email: 'bob@example.com',
        password: 'password123',
        fullName: 'Bob Smith',
      },
      {
        email: 'charlie@example.com',
        password: 'password123',
        fullName: 'Charlie Davis',
      },
      {
        email: 'diana@example.com',
        password: 'password123',
        fullName: 'Diana Martinez',
      },
      {
        email: 'evan@example.com',
        password: 'password123',
        fullName: 'Evan Wilson',
      },
      {
        email: 'fiona@example.com',
        password: 'password123',
        fullName: 'Fiona Brown',
      },
    ]);

    console.log(`Created ${users.length} test users`);

    // Generate daily step data for the past 30 days for each user
    const today = DateTime.now();
    const stepData = [];

    for (const user of users) {
      // Each user has a baseline step count between 5000-12000
      const baselineSteps = Math.floor(Math.random() * 7000) + 5000;

      for (let i = 0; i < 30; i++) {
        const date = today.minus({ days: i });
        // Add random variation (-2000 to +3000 steps from baseline)
        const variation = Math.floor(Math.random() * 5000) - 2000;
        const steps = Math.max(0, baselineSteps + variation);

        stepData.push({
          userId: user.id,
          date: date,
          steps: steps,
          primaryAccountId: null, // No real FitBit account for test users
        });
      }
    }

    await DailyStep.createMany(stepData);
    console.log(`Created ${stepData.length} daily step records`);

    // Create a few competitions
    const competition1 = await Competition.create({
      name: 'Monthly Step Challenge',
      description: 'See who can walk the most steps this month!',
      startDate: today.startOf('month'),
      endDate: today.endOf('month'),
      goalType: 'total_steps',
      goalValue: null,
      visibility: 'private',
      status: 'active',
      createdBy: users[0].id,
    });

    const competition2 = await Competition.create({
      name: '10K Daily Goal',
      description: 'Reach 10,000 steps every day for a week!',
      startDate: today.minus({ days: 7 }),
      endDate: today,
      goalType: 'goal_based',
      goalValue: 10000,
      visibility: 'private',
      status: 'active',
      createdBy: users[1].id,
    });

    const competition3 = await Competition.create({
      name: 'Summer Fitness Challenge',
      description: 'Get ready for summer with this 3-week challenge!',
      startDate: today.plus({ days: 5 }),
      endDate: today.plus({ days: 26 }),
      goalType: 'total_steps',
      goalValue: null,
      visibility: 'private',
      status: 'draft',
      createdBy: users[2].id,
    });

    console.log('Created 3 test competitions');

    // Add members to competitions
    const memberData = [
      // Competition 1 - Monthly Step Challenge (4 members)
      { competitionId: competition1.id, userId: users[0].id, status: 'accepted', invitedBy: null }, // Creator
      { competitionId: competition1.id, userId: users[1].id, status: 'accepted', invitedBy: users[0].id },
      { competitionId: competition1.id, userId: users[2].id, status: 'accepted', invitedBy: users[0].id },
      { competitionId: competition1.id, userId: users[3].id, status: 'invited', invitedBy: users[0].id }, // Pending

      // Competition 2 - 10K Daily Goal (3 members)
      { competitionId: competition2.id, userId: users[1].id, status: 'accepted', invitedBy: null }, // Creator
      { competitionId: competition2.id, userId: users[4].id, status: 'accepted', invitedBy: users[1].id },
      { competitionId: competition2.id, userId: users[5].id, status: 'accepted', invitedBy: users[1].id },

      // Competition 3 - Summer Fitness Challenge (5 members)
      { competitionId: competition3.id, userId: users[2].id, status: 'accepted', invitedBy: null }, // Creator
      { competitionId: competition3.id, userId: users[0].id, status: 'accepted', invitedBy: users[2].id },
      { competitionId: competition3.id, userId: users[3].id, status: 'accepted', invitedBy: users[2].id },
      { competitionId: competition3.id, userId: users[4].id, status: 'invited', invitedBy: users[2].id }, // Pending
      { competitionId: competition3.id, userId: users[5].id, status: 'declined', invitedBy: users[2].id }, // Declined
    ];

    await CompetitionMember.createMany(memberData);
    console.log(`Created ${memberData.length} competition memberships`);

    console.log('\n=== Seeding Complete ===');
    console.log('Test user credentials:');
    console.log('Email: alice@example.com | Password: password123');
    console.log('Email: bob@example.com | Password: password123');
    console.log('Email: charlie@example.com | Password: password123');
    console.log('Email: diana@example.com | Password: password123');
    console.log('Email: evan@example.com | Password: password123');
    console.log('Email: fiona@example.com | Password: password123');
  }
}
