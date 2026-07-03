/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types';
import type { Registry } from './schema.d.ts';
import type { ApiDefinition } from './tree.d.ts';

const placeholder: any = {};

const routes = {
  'webhooks.fitbit.verify': {
    methods: ['GET', 'HEAD'],
    pattern: '/webhooks/fitbit',
    tokens: [
      { old: '/webhooks/fitbit', type: 0, val: 'webhooks', end: '' },
      { old: '/webhooks/fitbit', type: 0, val: 'fitbit', end: '' },
    ],
    types: placeholder as Registry['webhooks.fitbit.verify']['types'],
  },
  'webhooks.fitbit.notify': {
    methods: ['POST'],
    pattern: '/webhooks/fitbit',
    tokens: [
      { old: '/webhooks/fitbit', type: 0, val: 'webhooks', end: '' },
      { old: '/webhooks/fitbit', type: 0, val: 'fitbit', end: '' },
    ],
    types: placeholder as Registry['webhooks.fitbit.notify']['types'],
  },
  'auth.register.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/register',
    tokens: [{ old: '/register', type: 0, val: 'register', end: '' }],
    types: placeholder as Registry['auth.register.show']['types'],
  },
  'auth.register': {
    methods: ['POST'],
    pattern: '/register',
    tokens: [{ old: '/register', type: 0, val: 'register', end: '' }],
    types: placeholder as Registry['auth.register']['types'],
  },
  'auth.login.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/login',
    tokens: [{ old: '/login', type: 0, val: 'login', end: '' }],
    types: placeholder as Registry['auth.login.show']['types'],
  },
  'auth.login': {
    methods: ['POST'],
    pattern: '/login',
    tokens: [{ old: '/login', type: 0, val: 'login', end: '' }],
    types: placeholder as Registry['auth.login']['types'],
  },
  'auth.logout': {
    methods: ['POST'],
    pattern: '/logout',
    tokens: [{ old: '/logout', type: 0, val: 'logout', end: '' }],
    types: placeholder as Registry['auth.logout']['types'],
  },
  'profile.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/profile',
    tokens: [{ old: '/profile', type: 0, val: 'profile', end: '' }],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.accounts.unlink': {
    methods: ['DELETE'],
    pattern: '/profile/accounts/:id',
    tokens: [
      { old: '/profile/accounts/:id', type: 0, val: 'profile', end: '' },
      { old: '/profile/accounts/:id', type: 0, val: 'accounts', end: '' },
      { old: '/profile/accounts/:id', type: 1, val: 'id', end: '' },
    ],
    types: placeholder as Registry['profile.accounts.unlink']['types'],
  },
  'profile.set-preferred-provider': {
    methods: ['POST'],
    pattern: '/profile/set-preferred-provider',
    tokens: [
      { old: '/profile/set-preferred-provider', type: 0, val: 'profile', end: '' },
      { old: '/profile/set-preferred-provider', type: 0, val: 'set-preferred-provider', end: '' },
    ],
    types: placeholder as Registry['profile.set-preferred-provider']['types'],
  },
  'google.redirect': {
    methods: ['GET', 'HEAD'],
    pattern: '/auth/google',
    tokens: [
      { old: '/auth/google', type: 0, val: 'auth', end: '' },
      { old: '/auth/google', type: 0, val: 'google', end: '' },
    ],
    types: placeholder as Registry['google.redirect']['types'],
  },
  'google.callback': {
    methods: ['GET', 'HEAD'],
    pattern: '/auth/google/callback',
    tokens: [
      { old: '/auth/google/callback', type: 0, val: 'auth', end: '' },
      { old: '/auth/google/callback', type: 0, val: 'google', end: '' },
      { old: '/auth/google/callback', type: 0, val: 'callback', end: '' },
    ],
    types: placeholder as Registry['google.callback']['types'],
  },
  'fitbit.redirect': {
    methods: ['GET', 'HEAD'],
    pattern: '/auth/fitbit',
    tokens: [
      { old: '/auth/fitbit', type: 0, val: 'auth', end: '' },
      { old: '/auth/fitbit', type: 0, val: 'fitbit', end: '' },
    ],
    types: placeholder as Registry['fitbit.redirect']['types'],
  },
  'fitbit.callback': {
    methods: ['GET', 'HEAD'],
    pattern: '/auth/fitbit/callback',
    tokens: [
      { old: '/auth/fitbit/callback', type: 0, val: 'auth', end: '' },
      { old: '/auth/fitbit/callback', type: 0, val: 'fitbit', end: '' },
      { old: '/auth/fitbit/callback', type: 0, val: 'callback', end: '' },
    ],
    types: placeholder as Registry['fitbit.callback']['types'],
  },
  'friends.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/friends',
    tokens: [{ old: '/friends', type: 0, val: 'friends', end: '' }],
    types: placeholder as Registry['friends.index']['types'],
  },
  'friends.create': {
    methods: ['GET', 'HEAD'],
    pattern: '/friends/add',
    tokens: [
      { old: '/friends/add', type: 0, val: 'friends', end: '' },
      { old: '/friends/add', type: 0, val: 'add', end: '' },
    ],
    types: placeholder as Registry['friends.create']['types'],
  },
  'friends.search': {
    methods: ['POST'],
    pattern: '/friends/search',
    tokens: [
      { old: '/friends/search', type: 0, val: 'friends', end: '' },
      { old: '/friends/search', type: 0, val: 'search', end: '' },
    ],
    types: placeholder as Registry['friends.search']['types'],
  },
  'friends.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/friends/:userId',
    tokens: [
      { old: '/friends/:userId', type: 0, val: 'friends', end: '' },
      { old: '/friends/:userId', type: 1, val: 'userId', end: '' },
    ],
    types: placeholder as Registry['friends.show']['types'],
  },
  'friends.store': {
    methods: ['POST'],
    pattern: '/friends/:userId',
    tokens: [
      { old: '/friends/:userId', type: 0, val: 'friends', end: '' },
      { old: '/friends/:userId', type: 1, val: 'userId', end: '' },
    ],
    types: placeholder as Registry['friends.store']['types'],
  },
  'friends.accept': {
    methods: ['POST'],
    pattern: '/friends/:id/accept',
    tokens: [
      { old: '/friends/:id/accept', type: 0, val: 'friends', end: '' },
      { old: '/friends/:id/accept', type: 1, val: 'id', end: '' },
      { old: '/friends/:id/accept', type: 0, val: 'accept', end: '' },
    ],
    types: placeholder as Registry['friends.accept']['types'],
  },
  'friends.decline': {
    methods: ['POST'],
    pattern: '/friends/:id/decline',
    tokens: [
      { old: '/friends/:id/decline', type: 0, val: 'friends', end: '' },
      { old: '/friends/:id/decline', type: 1, val: 'id', end: '' },
      { old: '/friends/:id/decline', type: 0, val: 'decline', end: '' },
    ],
    types: placeholder as Registry['friends.decline']['types'],
  },
  'friends.destroy': {
    methods: ['DELETE'],
    pattern: '/friends/:id',
    tokens: [
      { old: '/friends/:id', type: 0, val: 'friends', end: '' },
      { old: '/friends/:id', type: 1, val: 'id', end: '' },
    ],
    types: placeholder as Registry['friends.destroy']['types'],
  },
  'competitions.index': {
    methods: ['GET', 'HEAD'],
    pattern: '/competitions',
    tokens: [{ old: '/competitions', type: 0, val: 'competitions', end: '' }],
    types: placeholder as Registry['competitions.index']['types'],
  },
  'competitions.create': {
    methods: ['GET', 'HEAD'],
    pattern: '/competitions/create',
    tokens: [
      { old: '/competitions/create', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/create', type: 0, val: 'create', end: '' },
    ],
    types: placeholder as Registry['competitions.create']['types'],
  },
  'competitions.store': {
    methods: ['POST'],
    pattern: '/competitions',
    tokens: [{ old: '/competitions', type: 0, val: 'competitions', end: '' }],
    types: placeholder as Registry['competitions.store']['types'],
  },
  'competitions.show': {
    methods: ['GET', 'HEAD'],
    pattern: '/competitions/:id',
    tokens: [
      { old: '/competitions/:id', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id', type: 1, val: 'id', end: '' },
    ],
    types: placeholder as Registry['competitions.show']['types'],
  },
  'competitions.edit': {
    methods: ['GET', 'HEAD'],
    pattern: '/competitions/:id/edit',
    tokens: [
      { old: '/competitions/:id/edit', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id/edit', type: 1, val: 'id', end: '' },
      { old: '/competitions/:id/edit', type: 0, val: 'edit', end: '' },
    ],
    types: placeholder as Registry['competitions.edit']['types'],
  },
  'competitions.update': {
    methods: ['PUT'],
    pattern: '/competitions/:id',
    tokens: [
      { old: '/competitions/:id', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id', type: 1, val: 'id', end: '' },
    ],
    types: placeholder as Registry['competitions.update']['types'],
  },
  'competitions.launch': {
    methods: ['POST'],
    pattern: '/competitions/:id/launch',
    tokens: [
      { old: '/competitions/:id/launch', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id/launch', type: 1, val: 'id', end: '' },
      { old: '/competitions/:id/launch', type: 0, val: 'launch', end: '' },
    ],
    types: placeholder as Registry['competitions.launch']['types'],
  },
  'competitions.destroy': {
    methods: ['DELETE'],
    pattern: '/competitions/:id',
    tokens: [
      { old: '/competitions/:id', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id', type: 1, val: 'id', end: '' },
    ],
    types: placeholder as Registry['competitions.destroy']['types'],
  },
  'competitions.invite.form': {
    methods: ['GET', 'HEAD'],
    pattern: '/competitions/:id/invite',
    tokens: [
      { old: '/competitions/:id/invite', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id/invite', type: 1, val: 'id', end: '' },
      { old: '/competitions/:id/invite', type: 0, val: 'invite', end: '' },
    ],
    types: placeholder as Registry['competitions.invite.form']['types'],
  },
  'competitions.invite': {
    methods: ['POST'],
    pattern: '/competitions/:id/invite',
    tokens: [
      { old: '/competitions/:id/invite', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id/invite', type: 1, val: 'id', end: '' },
      { old: '/competitions/:id/invite', type: 0, val: 'invite', end: '' },
    ],
    types: placeholder as Registry['competitions.invite']['types'],
  },
  'competitions.accept': {
    methods: ['POST'],
    pattern: '/competitions/:id/accept',
    tokens: [
      { old: '/competitions/:id/accept', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id/accept', type: 1, val: 'id', end: '' },
      { old: '/competitions/:id/accept', type: 0, val: 'accept', end: '' },
    ],
    types: placeholder as Registry['competitions.accept']['types'],
  },
  'competitions.decline': {
    methods: ['POST'],
    pattern: '/competitions/:id/decline',
    tokens: [
      { old: '/competitions/:id/decline', type: 0, val: 'competitions', end: '' },
      { old: '/competitions/:id/decline', type: 1, val: 'id', end: '' },
      { old: '/competitions/:id/decline', type: 0, val: 'decline', end: '' },
    ],
    types: placeholder as Registry['competitions.decline']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>;

export { routes };

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
};

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes;
    $tree: ApiDefinition;
  }
}
