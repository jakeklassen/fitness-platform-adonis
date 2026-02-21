import Competition from '#models/competition';
import CompetitionMember from '#models/competition_member';
import Friendship from '#models/friendship';
import User from '#models/user';
import { CompetitionService } from '#services/competition_service';
import { createCompetitionValidator, updateCompetitionValidator } from '#validators/competition';
import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

export default class CompetitionsController {
  /**
   * Display a list of all competitions for the authenticated user
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail();

    // Get competitions user is a member of
    const memberships = await CompetitionMember.query()
      .where('user_id', user.id)
      .preload('competition', (query) => {
        query.whereNull('deleted_at').preload('creator');
      })
      .orderBy('created_at', 'desc');

    // Get competitions created by user
    const created = await Competition.query()
      .where('created_by', user.id)
      .whereNull('deleted_at')
      .preload('creator')
      .orderBy('created_at', 'desc');

    // Combine and deduplicate
    const competitionMap = new Map();

    created.forEach((comp) => {
      competitionMap.set(comp.id, {
        competition: comp,
        membership: null,
        isCreator: true,
      });
    });

    memberships.forEach((membership) => {
      // Skip if competition was deleted
      if (!membership.competition) {
        return;
      }

      if (!competitionMap.has(membership.competition.id)) {
        competitionMap.set(membership.competition.id, {
          competition: membership.competition,
          membership: membership,
          isCreator: membership.competition.createdBy === user.id,
        });
      } else {
        // Update with membership info if exists
        const existing = competitionMap.get(membership.competition.id);
        existing.membership = membership;
      }
    });

    const competitions = Array.from(competitionMap.values());

    return inertia.render('competitions/index', { competitions });
  }

  /**
   * Display the form for creating a new competition
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('competitions/form', {
      competition: null,
      isEdit: false,
    });
  }

  /**
   * Handle creation of a new competition
   */
  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const data = await request.validateUsing(createCompetitionValidator);

    const competition = await Competition.create({
      name: data.name,
      description: data.description,
      startDate: DateTime.fromJSDate(data.startDate),
      endDate: DateTime.fromJSDate(data.endDate),
      goalType: data.goalType,
      goalValue: data.goalValue,
      visibility: data.visibility || 'private',
      createdBy: user.id,
      status: 'draft',
    });

    // Auto-add creator as accepted member
    await CompetitionMember.create({
      competitionId: competition.id,
      userId: user.id,
      status: 'accepted',
      invitedBy: null,
    });

    // Trigger backfill for the creator (async, don't wait)
    const competitionService = new CompetitionService();
    await competitionService.triggerBackfillForCreator(competition.id, user.id);

    session.flash('success', 'Competition created successfully!');
    return response.redirect().toRoute('competitions.show', { id: competition.id });
  }

  /**
   * Display competition details and leaderboard
   */
  async show({ auth, params, inertia, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const competitionId = params.id;

    const competition = await Competition.query()
      .where('id', competitionId)
      .whereNull('deleted_at')
      .preload('creator')
      .preload('members', (query) => {
        query.preload('user');
      })
      .firstOrFail();

    const competitionService = new CompetitionService();

    // Check if user is a member
    const isMember = await competitionService.isUserMember(competitionId, user.id);
    const isCreator = competition.createdBy === user.id;

    if (!isMember && !isCreator) {
      session.flash('error', 'You do not have access to this competition');
      return response.redirect().toRoute('competitions.index');
    }

    // Get leaderboard and stats
    let leaderboard = null;
    let stats = null;

    try {
      stats = await competitionService.getCompetitionStats(competitionId, user.id);
      leaderboard = stats.leaderboard;
    } catch (error) {
      // User might not have access yet
    }

    // Get user's membership status
    const membership = await CompetitionMember.query()
      .where('competition_id', competitionId)
      .where('user_id', user.id)
      .first();

    return inertia.render('competitions/show', {
      competition,
      leaderboard,
      stats,
      membership,
      isMember,
      isCreator,
    });
  }

  /**
   * Display form to edit a competition
   */
  async edit({ auth, params, inertia, response, session }: HttpContext) {
    const user = auth.getUserOrFail();

    const competition = await Competition.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail();

    if (competition.createdBy !== user.id) {
      session.flash('error', 'Only the creator can edit this competition');
      return response.redirect().toRoute('competitions.show', { id: competition.id });
    }

    return inertia.render('competitions/form', {
      competition,
      isEdit: true,
    });
  }

  /**
   * Update a competition
   */
  async update({ auth, params, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const data = await request.validateUsing(updateCompetitionValidator);

    const competition = await Competition.findOrFail(params.id);

    if (competition.createdBy !== user.id) {
      session.flash('error', 'Only the creator can update this competition');
      return response.redirect().toRoute('competitions.show', { id: competition.id });
    }

    // Convert dates if present
    const updateData: any = { ...data };
    if (data.startDate) {
      updateData.startDate = DateTime.fromJSDate(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = DateTime.fromJSDate(data.endDate);
    }

    await competition.merge(updateData).save();

    session.flash('success', 'Competition updated successfully!');
    return response.redirect().toRoute('competitions.show', { id: competition.id });
  }

  /**
   * Launch a draft competition (transition to active)
   */
  async launch({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();

    const competition = await Competition.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail();

    if (competition.createdBy !== user.id) {
      session.flash('error', 'Only the creator can launch this competition');
      return response.redirect().toRoute('competitions.show', { id: competition.id });
    }

    if (competition.status !== 'draft') {
      session.flash('error', 'Only draft competitions can be launched');
      return response.redirect().toRoute('competitions.show', { id: competition.id });
    }

    competition.status = 'active';
    await competition.save();

    session.flash('success', 'Competition launched successfully!');
    return response.redirect().toRoute('competitions.show', { id: competition.id });
  }

  /**
   * Cancel (soft delete) a competition
   */
  async destroy({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const competitionService = new CompetitionService();

    try {
      await competitionService.cancelCompetition(params.id, user.id);
      session.flash('success', 'Competition cancelled successfully');
    } catch (error) {
      session.flash('error', error.message);
    }

    return response.redirect().toRoute('competitions.index');
  }

  /**
   * Display invitation form
   */
  async inviteForm({ auth, params, inertia, response, session }: HttpContext) {
    const user = auth.getUserOrFail();

    const competition = await Competition.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail();

    const competitionService = new CompetitionService();
    const isMember = await competitionService.isUserMember(params.id, user.id);
    const isCreator = competition.createdBy === user.id;

    if (!isMember && !isCreator) {
      session.flash('error', 'You do not have permission to invite users');
      return response.redirect().toRoute('competitions.show', { id: competition.id });
    }

    // Get current competition members
    const memberUserIds = await CompetitionMember.query()
      .where('competition_id', params.id)
      .select('user_id');

    const memberIds = memberUserIds.map((m) => m.userId);

    // Get user's accepted friends (both directions)
    const acceptedFriendships = await Friendship.query()
      .where((query) => {
        query.where('user_id', user.id).orWhere('friend_id', user.id);
      })
      .where('status', 'accepted')
      .preload('user')
      .preload('friend');

    // Extract friend IDs
    const friendIds = acceptedFriendships.map((friendship) => {
      return friendship.userId === user.id ? friendship.friendId : friendship.userId;
    });

    // Get friends who are not already members
    const availableFriendIds = friendIds.filter((id) => !memberIds.includes(id));

    const availableUsers = await User.query()
      .whereIn('id', availableFriendIds)
      .select('id', 'email', 'full_name')
      .orderBy('full_name', 'asc');

    return inertia.render('competitions/invite', {
      competition,
      availableUsers,
    });
  }

  /**
   * Invite a user to the competition
   */
  async invite({ auth, params, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const { userId } = request.only(['userId']);

    const competitionService = new CompetitionService();

    try {
      await competitionService.inviteUser(params.id, userId, user.id);
      session.flash('success', 'User invited successfully!');
    } catch (error) {
      session.flash('error', error.message);
    }

    return response.redirect().toRoute('competitions.show', { id: params.id });
  }

  /**
   * Accept an invitation
   */
  async accept({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const competitionService = new CompetitionService();

    try {
      await competitionService.acceptInvitation(params.id, user.id);
      session.flash('success', 'Invitation accepted!');
    } catch (error) {
      session.flash('error', error.message);
    }

    return response.redirect().toRoute('competitions.show', { id: params.id });
  }

  /**
   * Decline an invitation
   */
  async decline({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const competitionService = new CompetitionService();

    try {
      await competitionService.declineInvitation(params.id, user.id);
      session.flash('success', 'Invitation declined');
    } catch (error) {
      session.flash('error', error.message);
    }

    return response.redirect().toRoute('competitions.index');
  }
}
