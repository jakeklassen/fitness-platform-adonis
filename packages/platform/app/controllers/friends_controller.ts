import Friendship from '#models/friendship';
import User from '#models/user';
import type { HttpContext } from '@adonisjs/core/http';

export default class FriendsController {
  /**
   * Display friends list and pending requests
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.user!;

    // Get accepted friends (where user is either sender or receiver)
    const acceptedFriendships = await Friendship.query()
      .where((query) => {
        query.where('user_id', user.id).orWhere('friend_id', user.id);
      })
      .where('status', 'accepted')
      .preload('user')
      .preload('friend');

    // Map to actual friend users with friendship IDs
    const friends = acceptedFriendships.map((friendship) => {
      const friend = friendship.userId === user.id ? friendship.friend : friendship.user;
      return {
        ...friend.serialize(),
        friendshipId: friendship.id,
      };
    });

    // Get pending friend requests sent to this user
    const pendingRequests = await Friendship.query()
      .where('friend_id', user.id)
      .where('status', 'pending')
      .preload('user');

    // Get pending requests sent by this user
    const sentRequests = await Friendship.query()
      .where('user_id', user.id)
      .where('status', 'pending')
      .preload('friend');

    return inertia.render('friends/index', {
      friends: friends,
      pendingRequests: pendingRequests,
      sentRequests: sentRequests,
    });
  }

  /**
   * Show form to search and add friends by email
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('friends/create');
  }

  /**
   * Search for a user by email
   */
  async search({ auth, request, response }: HttpContext) {
    const user = auth.user!;
    const { email } = request.only(['email']);

    if (!email || email.trim() === '') {
      return response.json({ user: null, message: 'Please enter an email address' });
    }

    // Find user by email
    const searchedUser = await User.query()
      .where('email', email.trim().toLowerCase())
      .select('id', 'email', 'full_name')
      .first();

    if (!searchedUser) {
      return response.json({ user: null, message: 'No user found with this email address' });
    }

    // Check if it's the current user
    if (searchedUser.id === user.id) {
      return response.json({ user: null, message: 'You cannot add yourself as a friend' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.query()
      .where((query) => {
        query
          .where((subQuery) => {
            subQuery.where('user_id', user.id).where('friend_id', searchedUser.id);
          })
          .orWhere((subQuery) => {
            subQuery.where('user_id', searchedUser.id).where('friend_id', user.id);
          });
      })
      .first();

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        return response.json({
          user: null,
          message: 'You already have a pending friend request with this user',
        });
      } else if (existingFriendship.status === 'accepted') {
        return response.json({ user: null, message: 'You are already friends with this user' });
      }
    }

    return response.json({ user: searchedUser.serialize(), message: null });
  }

  /**
   * Send a friend request
   */
  async store({ auth, params, response, session }: HttpContext) {
    const user = auth.user!;
    const friendId = params.userId;

    // Check if friend exists
    const friend = await User.find(friendId);
    if (!friend) {
      session.flash('error', 'User not found');
      return response.redirect().back();
    }

    // Check if trying to friend yourself
    if (user.id === friendId) {
      session.flash('error', 'You cannot send a friend request to yourself');
      return response.redirect().back();
    }

    // Check if friendship already exists (in either direction)
    const existingFriendship = await Friendship.query()
      .where((query) => {
        query
          .where((subQuery) => {
            subQuery.where('user_id', user.id).where('friend_id', friendId);
          })
          .orWhere((subQuery) => {
            subQuery.where('user_id', friendId).where('friend_id', user.id);
          });
      })
      .first();

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        session.flash('error', 'A friend request is already pending with this user');
      } else if (existingFriendship.status === 'accepted') {
        session.flash('error', 'You are already friends with this user');
      } else {
        session.flash('error', 'Cannot send friend request to this user');
      }
      return response.redirect().back();
    }

    // Create friend request
    await Friendship.create({
      userId: user.id,
      friendId: friendId,
      status: 'pending',
    });

    session.flash('success', 'Friend request sent!');
    return response.redirect().toRoute('friends.index');
  }

  /**
   * Accept a friend request
   */
  async accept({ auth, params, response, session }: HttpContext) {
    const user = auth.user!;
    const friendshipId = params.id;

    const friendship = await Friendship.find(friendshipId);

    if (!friendship) {
      session.flash('error', 'Friend request not found');
      return response.redirect().back();
    }

    // Ensure this request was sent to the current user
    if (friendship.friendId !== user.id) {
      session.flash('error', 'You cannot accept this friend request');
      return response.redirect().back();
    }

    // Ensure it's still pending
    if (friendship.status !== 'pending') {
      session.flash('error', 'This friend request is no longer pending');
      return response.redirect().back();
    }

    friendship.status = 'accepted';
    await friendship.save();

    session.flash('success', 'Friend request accepted!');
    return response.redirect().toRoute('friends.index');
  }

  /**
   * Decline a friend request
   */
  async decline({ auth, params, response, session }: HttpContext) {
    const user = auth.user!;
    const friendshipId = params.id;

    const friendship = await Friendship.find(friendshipId);

    if (!friendship) {
      session.flash('error', 'Friend request not found');
      return response.redirect().back();
    }

    // Ensure this request was sent to the current user
    if (friendship.friendId !== user.id) {
      session.flash('error', 'You cannot decline this friend request');
      return response.redirect().back();
    }

    // Delete the friendship
    await friendship.delete();

    session.flash('success', 'Friend request declined');
    return response.redirect().toRoute('friends.index');
  }

  /**
   * Remove a friend
   */
  async destroy({ auth, params, response, session }: HttpContext) {
    const user = auth.user!;
    const friendshipId = params.id;

    const friendship = await Friendship.find(friendshipId);

    if (!friendship) {
      session.flash('error', 'Friendship not found');
      return response.redirect().back();
    }

    // Ensure the current user is part of this friendship
    if (friendship.userId !== user.id && friendship.friendId !== user.id) {
      session.flash('error', 'You cannot remove this friendship');
      return response.redirect().back();
    }

    await friendship.delete();

    session.flash('success', 'Friend removed');
    return response.redirect().toRoute('friends.index');
  }
}
