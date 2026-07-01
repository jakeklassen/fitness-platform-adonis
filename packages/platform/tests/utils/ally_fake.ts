import { HttpContext } from '@adonisjs/core/http';

/**
 * A minimal, reusable fake for `@adonisjs/ally` (which ships no test fake).
 *
 * `ctx.ally` is a per-request `HttpContext.getter` that news up an `AllyManager`,
 * so there is no container singleton to swap the way `emitter.fake()` does.
 * Instead we override the getter to return a fake manager whose `use()` only
 * resolves providers that were explicitly stubbed — calling `use()` with any
 * other provider throws, so a controller that switches providers fails loudly.
 *
 * Implements the subset of the Ally driver contract used by OAuth *callback*
 * controllers (`accessDenied`, `stateMisMatch`, `hasError`, `getError`, `user`).
 *
 * @example
 * const ally = allyFake();
 * ally.use('google').stubUser({ id, email, token: { token, refreshToken, expiresAt } });
 * // ...make the callback request...
 * ally.restore(); // or return it from a Japa `setup` hook as the cleanup fn
 */

export type FakeToken = { token: string; refreshToken: string | null; expiresAt: Date | null };
export type FakeSocialUser = { id: string; email: string; token: FakeToken };

class FakeAllyDriver {
  #user: FakeSocialUser | null = null;
  #accessDenied = false;
  #stateMisMatch = false;
  #error: string | null = null;

  stubUser(user: FakeSocialUser) {
    this.#user = user;

    return this;
  }

  denyAccess() {
    this.#accessDenied = true;

    return this;
  }

  mismatchState() {
    this.#stateMisMatch = true;

    return this;
  }

  failWith(error: string) {
    this.#error = error;

    return this;
  }

  accessDenied() {
    return this.#accessDenied;
  }

  stateMisMatch() {
    return this.#stateMisMatch;
  }

  hasError() {
    return this.#error !== null;
  }

  getError() {
    return this.#error;
  }

  async user() {
    if (!this.#user) {
      throw new Error('AllyFake: no stubbed user — call `.stubUser()` before requesting `.user()`');
    }

    return this.#user;
  }
}

export class AllyFake {
  #drivers = new Map<string, FakeAllyDriver>();
  #originalDescriptor = Object.getOwnPropertyDescriptor(HttpContext.prototype, 'ally');

  constructor() {
    const drivers = this.#drivers;

    HttpContext.getter(
      'ally',
      () =>
        ({
          use(provider: string) {
            const driver = drivers.get(provider);

            if (!driver) {
              const stubbed = [...drivers.keys()].map((name) => `"${name}"`).join(', ') || 'none';

              throw new Error(
                `AllyFake: unexpected provider "${provider}" — only ${stubbed} stubbed`,
              );
            }

            return driver;
          },
        }) as never,
      true,
    );
  }

  /**
   * Register (once) and return the fake driver for a provider.
   */
  use(provider: string) {
    let driver = this.#drivers.get(provider);

    if (!driver) {
      driver = new FakeAllyDriver();
      this.#drivers.set(provider, driver);
    }

    return driver;
  }

  /**
   * Restore the real `ctx.ally` getter.
   */
  restore() {
    if (this.#originalDescriptor) {
      Object.defineProperty(HttpContext.prototype, 'ally', this.#originalDescriptor);
    }
  }
}

export function allyFake() {
  return new AllyFake();
}
