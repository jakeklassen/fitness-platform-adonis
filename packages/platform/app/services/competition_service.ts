import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import DailyStep from '#models/daily_step';
import User from '#models/user';
import { StepsBackfillService } from '#services/steps_backfill_service';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';

export interface LeaderboardEntry {
  userId: number;
  user: User;
  totalSteps: number;
  dailyAverage: number;
  rank: number;
  goalReached?: boolean; // For goal-based competitions
}

export interface CompetitionStats {
  totalParticipants: number;
  activeParticipants: number; // Participants with at least 1 step
  averageSteps: number;
  leaderboard: LeaderboardEntry[];
}

export class CompetitionService {
  /**
   * Get leaderboard for a competition
   * Only accessible to competition members
   */
  async getLeaderboard(
    competitionId: number,
    requestingUserId: number,
  ): Promise<LeaderboardEntry[]> {
    const competition = await Competition.findOrFail(competitionId);

    // Verify user is a member
    const isMember = await this.isUserMember(competitionId, requestingUserId);
    if (!isMember) {
      throw new Error('Access denied: You must be a competition member to view the leaderboard');
    }

    // Get all accepted members
    const members = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('status', 'accepted')
      .preload('user');

    // Get steps for each member during competition period
    const now = DateTime.now();
    const end = competition.endDate < now ? competition.endDate : now;
    const elapsedDays = Math.max(1, Math.ceil(end.diff(competition.startDate, 'days').days));

    const leaderboard: LeaderboardEntry[] = [];

    for (const member of members) {
      const result = await DailyStep.query()
        .where('user_id', member.userId)
        .whereBetween('date', [
          competition.startDate.toISODate()!,
          competition.endDate.toISODate()!,
        ])
        .sum('steps as total');

      const totalSteps = Number(result[0].$extras.total || 0);

      leaderboard.push({
        userId: member.userId,
        user: member.user,
        totalSteps,
        dailyAverage: Math.round(totalSteps / elapsedDays),
        rank: 0, // Will be set below
        goalReached:
          competition.goalType === 'goal_based' && competition.goalValue
            ? totalSteps >= competition.goalValue
            : undefined,
      });
    }

    // Sort by total steps (descending) and assign ranks
    leaderboard.sort((a, b) => b.totalSteps - a.totalSteps);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }

  /**
   * Get competition statistics
   */
  async getCompetitionStats(
    competitionId: number,
    requestingUserId: number,
  ): Promise<CompetitionStats> {
    const leaderboard = await this.getLeaderboard(competitionId, requestingUserId);

    const totalParticipants = leaderboard.length;
    const activeParticipants = leaderboard.filter((entry) => entry.totalSteps > 0).length;
    const totalSteps = leaderboard.reduce((sum, entry) => sum + entry.totalSteps, 0);
    const averageSteps = totalParticipants > 0 ? Math.round(totalSteps / totalParticipants) : 0;

    return {
      totalParticipants,
      activeParticipants,
      averageSteps,
      leaderboard,
    };
  }

  /**
   * Invite a user to a competition
   */
  async inviteUser(
    competitionId: number,
    userIdToInvite: number,
    invitedByUserId: number,
  ): Promise<CompetitionMember> {
    const competition = await Competition.findOrFail(competitionId);

    // Verify inviter has permission (creator or existing member)
    if (competition.createdBy !== invitedByUserId) {
      const isMember = await this.isUserMember(competitionId, invitedByUserId);
      if (!isMember) {
        throw new Error('Access denied: Only competition members can invite others');
      }
    }

    // Check if user is already invited/member
    const existing = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('user_id', userIdToInvite)
      .first();

    if (existing) {
      throw new Error('User is already invited or a member of this competition');
    }

    // Create invitation
    const member = await CompetitionMember.create({
      competitionId,
      userId: userIdToInvite,
      status: 'invited',
      invitedBy: invitedByUserId,
    });

    return member;
  }

  /**
   * Accept a competition invitation
   */
  async acceptInvitation(competitionId: number, userId: number): Promise<CompetitionMember> {
    const member = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('user_id', userId)
      .where('status', 'invited')
      .firstOrFail();

    member.status = 'accepted';
    await member.save();

    // Trigger backfill for the user (async, don't wait)
    this.triggerBackfillForUser(competitionId, userId).catch((error) => {
      logger.error(`Backfill failed for user ${userId} in competition ${competitionId}:`, error);
    });

    return member;
  }

  /**
   * Decline a competition invitation
   */
  async declineInvitation(competitionId: number, userId: number): Promise<CompetitionMember> {
    const member = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('user_id', userId)
      .where('status', 'invited')
      .firstOrFail();

    member.status = 'declined';
    await member.save();

    return member;
  }

  /**
   * Check if a user is a member of a competition
   */
  async isUserMember(competitionId: number, userId: number): Promise<boolean> {
    const member = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('user_id', userId)
      .where('status', 'accepted')
      .first();

    return member !== null;
  }

  /**
   * Get user's rank in a competition
   */
  async getUserRank(competitionId: number, userId: number): Promise<number | null> {
    const leaderboard = await this.getLeaderboard(competitionId, userId);
    const userEntry = leaderboard.find((entry) => entry.userId === userId);
    return userEntry?.rank ?? null;
  }

  /**
   * Soft delete a competition
   */
  async deleteCompetition(competitionId: number, userId: number): Promise<Competition> {
    const competition = await Competition.findOrFail(competitionId);

    // Only creator can delete
    if (competition.createdBy !== userId) {
      throw new Error('Access denied: Only the competition creator can delete it');
    }

    competition.deletedAt = DateTime.now();
    await competition.save();

    return competition;
  }

  /**
   * Update competition status based on dates
   * Should be run periodically (e.g., daily cron job)
   */
  async updateCompetitionStatuses(): Promise<void> {
    const now = DateTime.now();

    // Start active competitions
    await Competition.query()
      .where('status', 'draft')
      .where('start_date', '<=', now.toISODate()!)
      .whereNull('deleted_at')
      .update({ status: 'active' });

    // End active competitions
    await Competition.query()
      .where('status', 'active')
      .where('end_date', '<', now.toISODate()!)
      .whereNull('deleted_at')
      .update({ status: 'ended' });
  }

  /**
   * Trigger backfill for a user who joined a competition
   * Fetches historical data from competition start to today
   */
  private async triggerBackfillForUser(competitionId: number, userId: number): Promise<void> {
    const competition = await Competition.findOrFail(competitionId);
    const backfillService = new StepsBackfillService();

    const today = DateTime.now();
    const startDate = competition.startDate;
    const endDate = competition.endDate < today ? competition.endDate : today;

    logger.info(
      `Triggering backfill for user ${userId} in competition ${competitionId} from ${startDate.toISODate()} to ${endDate.toISODate()}`,
    );

    try {
      await backfillService.backfillSteps(userId, startDate, endDate);
      logger.info(`Backfill completed for user ${userId} in competition ${competitionId}`);
    } catch (error) {
      logger.error(`Backfill failed for user ${userId} in competition ${competitionId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger backfill for the competition creator
   * Should be called when a competition is created
   */
  async triggerBackfillForCreator(competitionId: number, userId: number): Promise<void> {
    // Fire and forget
    this.triggerBackfillForUser(competitionId, userId).catch((error) => {
      logger.error(
        `Creator backfill failed for user ${userId} in competition ${competitionId}:`,
        error,
      );
    });
  }

  /**
   * Check if any users in a competition have data gaps
   * and trigger backfills if needed
   */
  async ensureCompetitionDataComplete(competitionId: number): Promise<void> {
    const competition = await Competition.findOrFail(competitionId);
    const members = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('status', 'accepted');

    const backfillService = new StepsBackfillService();
    const today = DateTime.now();
    const startDate = competition.startDate;
    const endDate = competition.endDate < today ? competition.endDate : today;

    for (const member of members) {
      const needsBackfill = await backfillService.needsBackfill(member.userId, startDate, endDate);

      if (needsBackfill) {
        logger.info(
          `Triggering gap-fill for user ${member.userId} in competition ${competitionId}`,
        );

        // Fire and forget
        this.triggerBackfillForUser(competitionId, member.userId).catch((error) => {
          logger.error(`Gap-fill failed for user ${member.userId}:`, error);
        });
      }
    }
  }
}
