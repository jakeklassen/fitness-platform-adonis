import { defineConfig } from '@adonisjs/inertia';

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Whether to encrypt the browser history state. Shared data is now provided
   * by the Inertia middleware (`app/middleware/inertia_middleware.ts`).
   */
  encryptHistory: false,

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.tsx',
  },
});

export default inertiaConfig;
