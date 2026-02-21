import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import Friendship from '#models/friendship';
import { CompetitionService } from '#services/competition_service';
import logger from '@adonisjs/core/services/logger';

export interface DiscoveryFilters {
  search?: string;
  status?: 'active' | 'ended';
  source?: 'all' | 'friends';
}

export interface DiscoveredCompetition {
  competition: Competition;
  memberCount: number;
  userMembershipStatus: 'accepted' | 'invited' | 'declined' | null;
}

export class CompetitionDiscoveryService {
  /**
   * Discover public competitions with optional filters
   */
  async discoverCompetitions(
    userId: number,
    filters: DiscoveryFilters,
  ): Promise<DiscoveredCompetition[]> {
    const query = Competition.query()
      .where('visibility', 'public')
      .whereNot('status', 'draft')
      .whereNull('deleted_at')
      .preload('creator')
      .withCount('members', (q) => {
        q.where('status', 'accepted');
      });

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;

      query.where((group) => {
        group.whereILike('name', searchTerm).orWhereILike('description', searchTerm);
      });
    }

    if (filters.status) {
      query.where('status', filters.status);
    }

    if (filters.source === 'friends') {
      const friendIds = await this.getFriendIds(userId);

      query.whereIn('created_by', friendIds);
    }

    // Order: active first, then ended; within each by created_at DESC
    query.orderByRaw(`
      CASE status
        WHEN 'active' THEN 1
        WHEN 'ended' THEN 2
      END ASC
    `);
    query.orderBy('created_at', 'desc');

    const competitions = await query;

    // Load user's existing memberships in one query
    const membershipMap = await this.getUserMemberships(userId);

    return competitions.map((competition) => ({
      competition,
      memberCount: Number(competition.$extras.members_count),
      userMembershipStatus: membershipMap.get(competition.id) ?? null,
    }));
  }

  /**
   * Join a public competition.
   * Throws E_ROW_NOT_FOUND (404) if competition doesn't exist or is deleted.
   * Returns `{ error }` for business logic failures (not public, already a member).
   */
  async joinPublicCompetition(
    competitionId: number,
    userId: number,
  ): Promise<{ member: CompetitionMember; error?: never } | { member?: never; error: string }> {
    // firstOrFail throws E_ROW_NOT_FOUND → 404 for missing/deleted competitions
    const competition = await Competition.query()
      .where('id', competitionId)
      .whereNull('deleted_at')
      .firstOrFail();

    if (competition.visibility !== 'public') {
      return { error: 'This competition is not public' };
    }

    if (competition.status === 'draft') {
      return { error: 'This competition has not started yet' };
    }

    // Check for existing membership
    const existing = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('user_id', userId)
      .first();

    if (existing) {
      return { error: 'You are already a member of this competition' };
    }

    const member = await CompetitionMember.create({
      competitionId,
      userId,
      status: 'accepted',
      invitedBy: null,
    });

    // Trigger backfill (fire-and-forget)
    const competitionService = new CompetitionService();

    competitionService.triggerBackfillForUser(competitionId, userId).catch((backfillError) => {
      logger.error(
        `Backfill failed for user ${userId} after joining competition ${competitionId}:`,
        backfillError,
      );
    });

    return { member };
  }

  /**
   * Get IDs of the user's accepted friends (both directions)
   */
  private async getFriendIds(userId: number): Promise<number[]> {
    const friendships = await Friendship.query()
      .where((query) => {
        query.where('user_id', userId).orWhere('friend_id', userId);
      })
      .where('status', 'accepted');

    return friendships.map((f) => (f.userId === userId ? f.friendId : f.userId));
  }

  /**
   * Get a map of competition ID → membership status for the user
   */
  private async getUserMemberships(
    userId: number,
  ): Promise<Map<number, 'accepted' | 'invited' | 'declined'>> {
    const memberships = await CompetitionMember.query().where('user_id', userId);

    const map = new Map<number, 'accepted' | 'invited' | 'declined'>();

    for (const m of memberships) {
      map.set(m.competitionId, m.status);
    }

    return map;
  }
}
