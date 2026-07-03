/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type {
  ExtractBody,
  ExtractErrorResponse,
  ExtractQuery,
  ExtractQueryForGet,
  ExtractResponse,
} from '@tuyau/core/types';
import type { InferInput, SimpleError } from '@vinejs/vine/types';

export type ParamValue = string | number | bigint | boolean;

export interface Registry {
  'webhooks.fitbit.verify': {
    methods: ['GET', 'HEAD'];
    pattern: '/webhooks/fitbit';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/fitbit_webhook_controller').default['verify']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/fitbit_webhook_controller').default['verify']>>
      >;
    };
  };
  'webhooks.fitbit.notify': {
    methods: ['POST'];
    pattern: '/webhooks/fitbit';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<
          ReturnType<import('#controllers/fitbit_webhook_controller').default['handleNotification']>
        >
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<
          ReturnType<import('#controllers/fitbit_webhook_controller').default['handleNotification']>
        >
      >;
    };
  };
  'webhooks.google.notify': {
    methods: ['POST'];
    pattern: '/webhooks/google';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<
          ReturnType<import('#controllers/google_webhook_controller').default['handleNotification']>
        >
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<
          ReturnType<import('#controllers/google_webhook_controller').default['handleNotification']>
        >
      >;
    };
  };
  'auth.register.show': {
    methods: ['GET', 'HEAD'];
    pattern: '/register';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['showRegister']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['showRegister']>>
      >;
    };
  };
  'auth.register': {
    methods: ['POST'];
    pattern: '/register';
    types: {
      body: ExtractBody<InferInput<typeof import('#validators/auth/register').registerValidator>>;
      paramsTuple: [];
      params: {};
      query: ExtractQuery<InferInput<typeof import('#validators/auth/register').registerValidator>>;
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['register']>>
      >;
      errorResponse:
        | ExtractErrorResponse<
            Awaited<ReturnType<import('#controllers/auth_controller').default['register']>>
          >
        | { status: 422; response: { errors: SimpleError[] } };
    };
  };
  'auth.login.show': {
    methods: ['GET', 'HEAD'];
    pattern: '/login';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['showLogin']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['showLogin']>>
      >;
    };
  };
  'auth.login': {
    methods: ['POST'];
    pattern: '/login';
    types: {
      body: ExtractBody<InferInput<typeof import('#validators/auth/login').loginValidator>>;
      paramsTuple: [];
      params: {};
      query: ExtractQuery<InferInput<typeof import('#validators/auth/login').loginValidator>>;
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['login']>>
      >;
      errorResponse:
        | ExtractErrorResponse<
            Awaited<ReturnType<import('#controllers/auth_controller').default['login']>>
          >
        | { status: 422; response: { errors: SimpleError[] } };
    };
  };
  'auth.logout': {
    methods: ['POST'];
    pattern: '/logout';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['logout']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/auth_controller').default['logout']>>
      >;
    };
  };
  'profile.show': {
    methods: ['GET', 'HEAD'];
    pattern: '/profile';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/profiles_controller').default['show']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/profiles_controller').default['show']>>
      >;
    };
  };
  'profile.accounts.unlink': {
    methods: ['DELETE'];
    pattern: '/profile/accounts/:id';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/profiles_controller').default['unlinkAccount']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/profiles_controller').default['unlinkAccount']>>
      >;
    };
  };
  'profile.set-preferred-provider': {
    methods: ['POST'];
    pattern: '/profile/set-preferred-provider';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<
          ReturnType<import('#controllers/profiles_controller').default['setPreferredProvider']>
        >
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<
          ReturnType<import('#controllers/profiles_controller').default['setPreferredProvider']>
        >
      >;
    };
  };
  'google.redirect': {
    methods: ['GET', 'HEAD'];
    pattern: '/auth/google';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/google_controller').default['redirect']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/google_controller').default['redirect']>>
      >;
    };
  };
  'google.callback': {
    methods: ['GET', 'HEAD'];
    pattern: '/auth/google/callback';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/google_controller').default['callback']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/google_controller').default['callback']>>
      >;
    };
  };
  'fitbit.redirect': {
    methods: ['GET', 'HEAD'];
    pattern: '/auth/fitbit';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/fitbit_controller').default['redirect']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/fitbit_controller').default['redirect']>>
      >;
    };
  };
  'fitbit.callback': {
    methods: ['GET', 'HEAD'];
    pattern: '/auth/fitbit/callback';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/fitbit_controller').default['callback']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/fitbit_controller').default['callback']>>
      >;
    };
  };
  'friends.index': {
    methods: ['GET', 'HEAD'];
    pattern: '/friends';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['index']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['index']>>
      >;
    };
  };
  'friends.create': {
    methods: ['GET', 'HEAD'];
    pattern: '/friends/add';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['create']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['create']>>
      >;
    };
  };
  'friends.search': {
    methods: ['POST'];
    pattern: '/friends/search';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['search']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['search']>>
      >;
    };
  };
  'friends.show': {
    methods: ['GET', 'HEAD'];
    pattern: '/friends/:userId';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { userId: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['show']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['show']>>
      >;
    };
  };
  'friends.store': {
    methods: ['POST'];
    pattern: '/friends/:userId';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { userId: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['store']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['store']>>
      >;
    };
  };
  'friends.accept': {
    methods: ['POST'];
    pattern: '/friends/:id/accept';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['accept']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['accept']>>
      >;
    };
  };
  'friends.decline': {
    methods: ['POST'];
    pattern: '/friends/:id/decline';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['decline']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['decline']>>
      >;
    };
  };
  'friends.destroy': {
    methods: ['DELETE'];
    pattern: '/friends/:id';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['destroy']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/friends_controller').default['destroy']>>
      >;
    };
  };
  'competitions.index': {
    methods: ['GET', 'HEAD'];
    pattern: '/competitions';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['index']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['index']>>
      >;
    };
  };
  'competitions.create': {
    methods: ['GET', 'HEAD'];
    pattern: '/competitions/create';
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['create']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['create']>>
      >;
    };
  };
  'competitions.store': {
    methods: ['POST'];
    pattern: '/competitions';
    types: {
      body: ExtractBody<
        InferInput<typeof import('#validators/competition').createCompetitionValidator>
      >;
      paramsTuple: [];
      params: {};
      query: ExtractQuery<
        InferInput<typeof import('#validators/competition').createCompetitionValidator>
      >;
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['store']>>
      >;
      errorResponse:
        | ExtractErrorResponse<
            Awaited<ReturnType<import('#controllers/competitions_controller').default['store']>>
          >
        | { status: 422; response: { errors: SimpleError[] } };
    };
  };
  'competitions.show': {
    methods: ['GET', 'HEAD'];
    pattern: '/competitions/:id';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['show']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['show']>>
      >;
    };
  };
  'competitions.edit': {
    methods: ['GET', 'HEAD'];
    pattern: '/competitions/:id/edit';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['edit']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['edit']>>
      >;
    };
  };
  'competitions.update': {
    methods: ['PUT'];
    pattern: '/competitions/:id';
    types: {
      body: ExtractBody<
        InferInput<typeof import('#validators/competition').updateCompetitionValidator>
      >;
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: ExtractQuery<
        InferInput<typeof import('#validators/competition').updateCompetitionValidator>
      >;
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['update']>>
      >;
      errorResponse:
        | ExtractErrorResponse<
            Awaited<ReturnType<import('#controllers/competitions_controller').default['update']>>
          >
        | { status: 422; response: { errors: SimpleError[] } };
    };
  };
  'competitions.launch': {
    methods: ['POST'];
    pattern: '/competitions/:id/launch';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['launch']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['launch']>>
      >;
    };
  };
  'competitions.destroy': {
    methods: ['DELETE'];
    pattern: '/competitions/:id';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['destroy']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['destroy']>>
      >;
    };
  };
  'competitions.invite.form': {
    methods: ['GET', 'HEAD'];
    pattern: '/competitions/:id/invite';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['inviteForm']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['inviteForm']>>
      >;
    };
  };
  'competitions.invite': {
    methods: ['POST'];
    pattern: '/competitions/:id/invite';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['invite']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['invite']>>
      >;
    };
  };
  'competitions.accept': {
    methods: ['POST'];
    pattern: '/competitions/:id/accept';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['accept']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['accept']>>
      >;
    };
  };
  'competitions.decline': {
    methods: ['POST'];
    pattern: '/competitions/:id/decline';
    types: {
      body: {};
      paramsTuple: [ParamValue];
      params: { id: ParamValue };
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['decline']>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import('#controllers/competitions_controller').default['decline']>>
      >;
    };
  };
}
