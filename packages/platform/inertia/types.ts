import type { SharedProps } from '@adonisjs/inertia/types';
import type { PropsWithChildren } from 'react';

// Primitive values that are directly serializable in shared/page props.
type JsonPrimitive = string | number | boolean | null;

// Recursively model Inertia's JSON transport shape (e.g. Date -> string) for a
// page's props. Wrapping `T` in `Jsonify` turns every nested object into a
// mapped type, which gives it the implicit index signature that the generated
// `pages.d.ts` `ExtractProps` requires to satisfy `ComponentProps` — otherwise
// `inertia.render()` collapses its props parameter to `never`.
type Jsonify<T> = T extends undefined
  ? undefined
  : T extends JsonPrimitive
    ? T
    : T extends Date
      ? string
      : T extends Array<infer U>
        ? Jsonify<U>[]
        : T extends object
          ? { [K in keyof T]: Jsonify<T[K]> }
          : never;

/**
 * Props for an Inertia page component. Wraps the page-specific props `T` with
 * the shared props injected by the Inertia middleware
 * (`app/middleware/inertia_middleware.ts`, which augments `SharedProps`) and
 * `children`.
 */
export type InertiaProps<T extends object = Record<string, never>> = PropsWithChildren<
  SharedProps & Jsonify<T>
>;
