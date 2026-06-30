import { TuyauProvider } from '@adonisjs/inertia/react';
import { createInertiaApp } from '@inertiajs/react';
import ReactDOMServer from 'react-dom/server';
import { client } from '~/client';

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const pages = import.meta.glob('../pages/**/*.tsx', { eager: true });
      return pages[`../pages/${name}.tsx`];
    },
    setup: ({ App, props }) => (
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>
    ),
  });
}
