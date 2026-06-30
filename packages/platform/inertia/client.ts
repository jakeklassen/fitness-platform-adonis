import { registry } from '@generated/registry';
import { createTuyau } from '@tuyau/core/client';

/**
 * Tuyau client built from the generated route registry. Powers the type-safe
 * `<Link route="...">` from `@adonisjs/inertia/react` (via `<TuyauProvider>`)
 * and the `urlFor` helper.
 */
export const client = createTuyau({
  baseUrl: '/',
  registry,
});

export const urlFor = client.urlFor;
