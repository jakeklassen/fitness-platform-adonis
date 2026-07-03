/* eslint-disable prettier/prettier */
import type { routes } from './index.ts';

export interface ApiDefinition {
  webhooks: {
    fitbit: {
      verify: (typeof routes)['webhooks.fitbit.verify'];
      notify: (typeof routes)['webhooks.fitbit.notify'];
    };
    google: {
      notify: (typeof routes)['webhooks.google.notify'];
    };
  };
  auth: {
    register: (typeof routes)['auth.register'] & {
      show: (typeof routes)['auth.register.show'];
    };
    login: (typeof routes)['auth.login'] & {
      show: (typeof routes)['auth.login.show'];
    };
    logout: (typeof routes)['auth.logout'];
  };
  profile: {
    show: (typeof routes)['profile.show'];
    accounts: {
      unlink: (typeof routes)['profile.accounts.unlink'];
    };
    setPreferredProvider: (typeof routes)['profile.set-preferred-provider'];
  };
  google: {
    redirect: (typeof routes)['google.redirect'];
    callback: (typeof routes)['google.callback'];
  };
  fitbit: {
    redirect: (typeof routes)['fitbit.redirect'];
    callback: (typeof routes)['fitbit.callback'];
  };
  friends: {
    index: (typeof routes)['friends.index'];
    create: (typeof routes)['friends.create'];
    search: (typeof routes)['friends.search'];
    show: (typeof routes)['friends.show'];
    store: (typeof routes)['friends.store'];
    accept: (typeof routes)['friends.accept'];
    decline: (typeof routes)['friends.decline'];
    destroy: (typeof routes)['friends.destroy'];
  };
  competitions: {
    index: (typeof routes)['competitions.index'];
    create: (typeof routes)['competitions.create'];
    store: (typeof routes)['competitions.store'];
    show: (typeof routes)['competitions.show'];
    edit: (typeof routes)['competitions.edit'];
    update: (typeof routes)['competitions.update'];
    launch: (typeof routes)['competitions.launch'];
    destroy: (typeof routes)['competitions.destroy'];
    invite: (typeof routes)['competitions.invite'] & {
      form: (typeof routes)['competitions.invite.form'];
    };
    accept: (typeof routes)['competitions.accept'];
    decline: (typeof routes)['competitions.decline'];
  };
}
