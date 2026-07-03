import '@adonisjs/core/types/http';

type ParamValue = string | number | bigint | boolean;

export type ScannedRoutes = {
  ALL: {
    'webhooks.fitbit.verify': { paramsTuple?: []; params?: {} };
    'webhooks.fitbit.notify': { paramsTuple?: []; params?: {} };
    'webhooks.google.notify': { paramsTuple?: []; params?: {} };
    'auth.register.show': { paramsTuple?: []; params?: {} };
    'auth.register': { paramsTuple?: []; params?: {} };
    'auth.login.show': { paramsTuple?: []; params?: {} };
    'auth.login': { paramsTuple?: []; params?: {} };
    'auth.logout': { paramsTuple?: []; params?: {} };
    'profile.show': { paramsTuple?: []; params?: {} };
    'profile.accounts.unlink': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'profile.set-preferred-provider': { paramsTuple?: []; params?: {} };
    'google.redirect': { paramsTuple?: []; params?: {} };
    'google.callback': { paramsTuple?: []; params?: {} };
    'fitbit.redirect': { paramsTuple?: []; params?: {} };
    'fitbit.callback': { paramsTuple?: []; params?: {} };
    'friends.index': { paramsTuple?: []; params?: {} };
    'friends.create': { paramsTuple?: []; params?: {} };
    'friends.search': { paramsTuple?: []; params?: {} };
    'friends.show': { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
    'friends.store': { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
    'friends.accept': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'friends.decline': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'friends.destroy': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.index': { paramsTuple?: []; params?: {} };
    'competitions.create': { paramsTuple?: []; params?: {} };
    'competitions.store': { paramsTuple?: []; params?: {} };
    'competitions.show': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.edit': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.update': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.launch': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.destroy': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.invite.form': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.invite': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.accept': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.decline': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  GET: {
    'webhooks.fitbit.verify': { paramsTuple?: []; params?: {} };
    'auth.register.show': { paramsTuple?: []; params?: {} };
    'auth.login.show': { paramsTuple?: []; params?: {} };
    'profile.show': { paramsTuple?: []; params?: {} };
    'google.redirect': { paramsTuple?: []; params?: {} };
    'google.callback': { paramsTuple?: []; params?: {} };
    'fitbit.redirect': { paramsTuple?: []; params?: {} };
    'fitbit.callback': { paramsTuple?: []; params?: {} };
    'friends.index': { paramsTuple?: []; params?: {} };
    'friends.create': { paramsTuple?: []; params?: {} };
    'friends.show': { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
    'competitions.index': { paramsTuple?: []; params?: {} };
    'competitions.create': { paramsTuple?: []; params?: {} };
    'competitions.show': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.edit': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.invite.form': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  HEAD: {
    'webhooks.fitbit.verify': { paramsTuple?: []; params?: {} };
    'auth.register.show': { paramsTuple?: []; params?: {} };
    'auth.login.show': { paramsTuple?: []; params?: {} };
    'profile.show': { paramsTuple?: []; params?: {} };
    'google.redirect': { paramsTuple?: []; params?: {} };
    'google.callback': { paramsTuple?: []; params?: {} };
    'fitbit.redirect': { paramsTuple?: []; params?: {} };
    'fitbit.callback': { paramsTuple?: []; params?: {} };
    'friends.index': { paramsTuple?: []; params?: {} };
    'friends.create': { paramsTuple?: []; params?: {} };
    'friends.show': { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
    'competitions.index': { paramsTuple?: []; params?: {} };
    'competitions.create': { paramsTuple?: []; params?: {} };
    'competitions.show': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.edit': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.invite.form': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  POST: {
    'webhooks.fitbit.notify': { paramsTuple?: []; params?: {} };
    'webhooks.google.notify': { paramsTuple?: []; params?: {} };
    'auth.register': { paramsTuple?: []; params?: {} };
    'auth.login': { paramsTuple?: []; params?: {} };
    'auth.logout': { paramsTuple?: []; params?: {} };
    'profile.set-preferred-provider': { paramsTuple?: []; params?: {} };
    'friends.search': { paramsTuple?: []; params?: {} };
    'friends.store': { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
    'friends.accept': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'friends.decline': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.store': { paramsTuple?: []; params?: {} };
    'competitions.launch': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.invite': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.accept': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.decline': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  DELETE: {
    'profile.accounts.unlink': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'friends.destroy': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    'competitions.destroy': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  PUT: {
    'competitions.update': { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
};
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}
