import env from '#start/env';
import { defineConfig } from '@adonisjs/ally';
import type { InferSocialProviders } from '@adonisjs/ally/types';
import { FitBitService } from 'adonis-ally-fitbit';

const allyConfig = defineConfig({
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
