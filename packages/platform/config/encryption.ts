import env from '#start/env';
import { defineConfig, drivers } from '@adonisjs/core/encryption';

/**
 * The encryption configuration.
 *
 * The `legacy` driver preserves the AdonisJS v6 encryption format
 * (AES-256-CBC + HMAC SHA-256) so existing encrypted data — such as the
 * encrypted FitBit access/refresh tokens on `ProviderAccount` — continues
 * to decrypt with the same `APP_KEY`.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
const encryptionConfig = defineConfig({
  default: 'legacy',
  list: {
    legacy: drivers.legacy({
      keys: [env.get('APP_KEY')],
    }),
  },
});

export default encryptionConfig;
