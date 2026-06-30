import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware';
import type { InferSharedProps } from '@adonisjs/inertia/types';

/**
 * Data shared with every Inertia page. In AdonisJS v7 / @adonisjs/inertia v4
 * the `sharedData` config option was removed in favour of an application
 * middleware that extends the base Inertia middleware.
 */
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  share(ctx: HttpContext) {
    return {
      user: ctx.inertia.always(ctx.auth?.user ?? null),
      flash: ctx.inertia.always(
        (ctx.session?.flashMessages.all() as { success?: string; error?: string }) ?? {},
      ),
    };
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx);

    const output = await next();

    this.dispose(ctx);

    return output;
  }
}

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<InertiaMiddleware> {}
}
