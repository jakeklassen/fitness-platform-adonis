import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/register': ExtractProps<(typeof import('../../inertia/pages/auth/register.tsx'))['default']>
    'competitions/form': ExtractProps<(typeof import('../../inertia/pages/competitions/form.tsx'))['default']>
    'competitions/index': ExtractProps<(typeof import('../../inertia/pages/competitions/index.tsx'))['default']>
    'competitions/invite': ExtractProps<(typeof import('../../inertia/pages/competitions/invite.tsx'))['default']>
    'competitions/show': ExtractProps<(typeof import('../../inertia/pages/competitions/show.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'friends/create': ExtractProps<(typeof import('../../inertia/pages/friends/create.tsx'))['default']>
    'friends/index': ExtractProps<(typeof import('../../inertia/pages/friends/index.tsx'))['default']>
    'friends/show': ExtractProps<(typeof import('../../inertia/pages/friends/show.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'profile': ExtractProps<(typeof import('../../inertia/pages/profile.tsx'))['default']>
  }
}
