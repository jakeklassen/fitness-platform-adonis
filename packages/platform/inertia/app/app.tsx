/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import { resolvePageComponent } from '@adonisjs/inertia/helpers';
import { TuyauProvider } from '@adonisjs/inertia/react';
import { createInertiaApp } from '@inertiajs/react';
import { hydrateRoot } from 'react-dom/client';
import { client } from '~/client';
import '../css/app.css';

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS';

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'));
  },

  setup({ el, App, props }) {
    hydrateRoot(
      el,
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>,
    );
  },
});
