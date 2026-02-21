import Competition from '#models/competition';
import CompetitionMember, { type MemberStatus } from '#models/competition_member';
import DailyStep from '#models/daily_step';
import User from '#models/user';
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
          primaryProviderAccountId: null, // No real FitBit account for test users
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

    // Create public competitions
    const competition4 = await Competition.create({
      name: 'Company-Wide Step-a-thon',
      description: 'A company-wide competition to see who can rack up the most steps!',
      startDate: today.startOf('month'),
      endDate: today.endOf('month'),
      goalType: 'total_steps',
      goalValue: null,
      visibility: 'public',
      status: 'active',
      createdBy: users[0].id,
    });

    const competition5 = await Competition.create({
      name: 'New Year Fitness Kickoff',
      description: 'Kick off the new year by hitting 8,000 steps every day!',
      startDate: today.minus({ weeks: 2 }),
      endDate: today.plus({ weeks: 1 }),
      goalType: 'goal_based',
      goalValue: 8000,
      visibility: 'public',
      status: 'active',
      createdBy: users[1].id,
    });

    const competition6 = await Competition.create({
      name: 'Spring Into Steps',
      description: 'Get moving this spring with a 3-week total steps challenge!',
      startDate: today.plus({ weeks: 2 }),
      endDate: today.plus({ weeks: 5 }),
      goalType: 'total_steps',
      goalValue: null,
      visibility: 'public',
      status: 'draft',
      createdBy: users[3].id,
    });

    console.log('Created 6 test competitions');

    // Add members to competitions
    const memberData: Array<{
      competitionId: number;
      userId: number;
      status: MemberStatus;
      invitedBy: number | null;
    }> = [
      // Competition 1 - Monthly Step Challenge (4 members, private)
      { competitionId: competition1.id, userId: users[0].id, status: 'accepted', invitedBy: null }, // Creator
      {
        competitionId: competition1.id,
        userId: users[1].id,
        status: 'accepted',
        invitedBy: users[0].id,
      },
      {
        competitionId: competition1.id,
        userId: users[2].id,
        status: 'accepted',
        invitedBy: users[0].id,
      },
      {
        competitionId: competition1.id,
        userId: users[3].id,
        status: 'invited',
        invitedBy: users[0].id,
      }, // Pending

      // Competition 2 - 10K Daily Goal (3 members, private)
      { competitionId: competition2.id, userId: users[1].id, status: 'accepted', invitedBy: null }, // Creator
      {
        competitionId: competition2.id,
        userId: users[4].id,
        status: 'accepted',
        invitedBy: users[1].id,
      },
      {
        competitionId: competition2.id,
        userId: users[5].id,
        status: 'accepted',
        invitedBy: users[1].id,
      },

      // Competition 3 - Summer Fitness Challenge (5 members, private)
      { competitionId: competition3.id, userId: users[2].id, status: 'accepted', invitedBy: null }, // Creator
      {
        competitionId: competition3.id,
        userId: users[0].id,
        status: 'accepted',
        invitedBy: users[2].id,
      },
      {
        competitionId: competition3.id,
        userId: users[3].id,
        status: 'accepted',
        invitedBy: users[2].id,
      },
      {
        competitionId: competition3.id,
        userId: users[4].id,
        status: 'invited',
        invitedBy: users[2].id,
      }, // Pending
      {
        competitionId: competition3.id,
        userId: users[5].id,
        status: 'declined',
        invitedBy: users[2].id,
      }, // Declined

      // Competition 4 - Company-Wide Step-a-thon (4 members, public)
      { competitionId: competition4.id, userId: users[0].id, status: 'accepted', invitedBy: null }, // Creator
      {
        competitionId: competition4.id,
        userId: users[1].id,
        status: 'accepted',
        invitedBy: users[0].id,
      },
      {
        competitionId: competition4.id,
        userId: users[3].id,
        status: 'accepted',
        invitedBy: users[0].id,
      },
      {
        competitionId: competition4.id,
        userId: users[4].id,
        status: 'invited',
        invitedBy: users[0].id,
      }, // Pending

      // Competition 5 - New Year Fitness Kickoff (3 members, public)
      { competitionId: competition5.id, userId: users[1].id, status: 'accepted', invitedBy: null }, // Creator
      {
        competitionId: competition5.id,
        userId: users[2].id,
        status: 'accepted',
        invitedBy: users[1].id,
      },
      {
        competitionId: competition5.id,
        userId: users[5].id,
        status: 'accepted',
        invitedBy: users[1].id,
      },

      // Competition 6 - Spring Into Steps (2 members, public)
      { competitionId: competition6.id, userId: users[3].id, status: 'accepted', invitedBy: null }, // Creator
      {
        competitionId: competition6.id,
        userId: users[0].id,
        status: 'accepted',
        invitedBy: users[3].id,
      },
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
