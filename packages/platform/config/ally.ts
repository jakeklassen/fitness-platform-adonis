import env from '#start/env';
import { defineConfig, services } from '@adonisjs/ally';
import type { InferSocialProviders } from '@adonisjs/ally/types';
import { FitBitService } from 'adonis-ally-fitbit';

const allyConfig = defineConfig({
  /**
   * Google Health (#54) — standard Google OAuth 2.0. `accessType: 'offline'` +
   * `prompt: 'consent'` are required to receive a refresh token. The
   * `activity_and_fitness.readonly` scope is a Restricted scope (requires Google
   * verification for production use).
   */
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: env.get('GOOGLE_CALLBACK_URL'),
    scopes: [
      // Identity scopes — required so `.user()` can read the Google profile
      // (the driver replaces its defaults when `scopes` is set).
      'openid',
      'userinfo.email',
      'userinfo.profile',
      // Google Health data access.
      'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
    ],
    accessType: 'offline',
    prompt: 'consent',
  }),

  /**
   * Fitbit — being retired in favour of Google Health (#54). Still registered
   * because the Fitbit data/webhook services consume it until their Google
   * replacements land.
   */
  fitbit: FitBitService({
    clientId: env.get('FITBIT_CLIENT_ID'),
    clientSecret: env.get('FITBIT_CLIENT_SECRET'),
    callbackUrl: env.get('FITBIT_CALLBACK_URL'),
  }),
});

export default allyConfig;

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
