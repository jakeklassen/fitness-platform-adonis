/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| Make sure you through the code and comments properly and make necessary
| changes as per the requirements of your implementation.
|
*/

/**
|--------------------------------------------------------------------------
 *  Search keyword "YouDriver" and replace it with a meaningful name
|--------------------------------------------------------------------------
 */

import { Oauth2Driver, RedirectRequest } from '@adonisjs/ally'
import type { AllyDriverContract, AllyUserContract, ApiRequestContract } from '@adonisjs/ally/types'
import type { HttpContext } from '@adonisjs/core/http'
import { createHash, randomBytes } from 'node:crypto'

/**
 *
 * Access token returned by your driver implementation. An access
 * token must have "token" and "type" properties and you may
 * define additional properties (if needed)
 */
export type FitBitAccessToken = {
  token: string
  type: 'bearer'
}

/**
 * Scopes accepted by the driver implementation.
 */
export type FitBitScopes =
  | 'activity'
  | 'nutrition'
  | 'heartrate'
  | 'location'
  | 'profile'
  | 'settings'
  | 'sleep'
  | 'social'
  | 'weight'
  | 'respiratory_rate'
  | 'oxygen_saturation'
  | 'cardio_fitness'
  | 'temperature'
  | 'electrocardiogram'
  | 'irregular_rhythm_notifications'

/**
 * The configuration accepted by the driver implementation.
 */
export type FitBitConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
}

/**
 * Driver implementation. It is mostly configuration driven except the API call
 * to get user info.
 */
export class FitBit
  extends Oauth2Driver<FitBitAccessToken, FitBitScopes>
  implements AllyDriverContract<FitBitAccessToken, FitBitScopes>
{
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'https://www.fitbit.com/oauth2/authorize'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://api.fitbit.com/oauth2/token'

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl = 'https://api.fitbit.com/1/user/-/profile.json'

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'fitbit_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  constructor(ctx: HttpContext, public config: FitBitConfig) {
    super(ctx, config)

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  /**
   * Generate a cryptographically random code verifier for PKCE
   * Length: 43-128 characters (we use 64 bytes = 86 characters base64url)
   */
  protected generateCodeVerifier(): string {
    return randomBytes(64)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Generate code challenge from code verifier using SHA256
   * Returns base64url-encoded hash without padding
   */
  protected generateCodeChallenge(verifier: string): string {
    return createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Configure the authorization redirect request to include PKCE parameters.
   * Fitbit requires PKCE for OAuth2 flows.
   */
  protected configureRedirectRequest(request: RedirectRequest<FitBitScopes>) {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = this.generateCodeChallenge(codeVerifier)

    /**
     * Add PKCE parameters to the authorization request
     */
    request.param('code_challenge', codeChallenge)
    request.param('code_challenge_method', 'S256')

    /**
     * Store the code verifier in a cookie to retrieve it during callback
     */
    this.ctx.response.cookie('fitbit_code_verifier', codeVerifier, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300, // 5 minutes - should be enough for OAuth flow
    })
  }

  /**
   * Configure the access token request to include PKCE code_verifier
   * and Basic Auth header as required by Fitbit
   */
  protected configureAccessTokenRequest(request: ApiRequestContract) {
    /**
     * Retrieve code verifier from cookie
     */
    const codeVerifier = this.ctx.request.cookie('fitbit_code_verifier')

    if (codeVerifier) {
      request.field('code_verifier', codeVerifier)
      /**
       * Clear the code verifier cookie after use
       */
      this.ctx.response.clearCookie('fitbit_code_verifier')
    }

    /**
     * Fitbit requires Basic Auth with base64-encoded clientId:clientSecret
     */
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    )
    request.header('Authorization', `Basic ${credentials}`)
  }

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  /**
   * Get the user details by querying the Fitbit API. This method returns
   * the access token and the user details.
   */
  async user(
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<FitBitAccessToken>> {
    const accessToken = await this.accessToken()
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    /**
     * Set Bearer token authorization
     */
    request.header('Authorization', `Bearer ${accessToken.token}`)

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if needed)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    const body = await request.get()

    return {
      id: body.user.encodedId,
      nickName: body.user.displayName,
      name: body.user.fullName,
      email: null, // Fitbit doesn't provide email in profile endpoint
      emailVerificationState: 'unsupported' as const,
      avatarUrl: body.user.avatar640 || body.user.avatar150 || body.user.avatar || null,
      original: body.user,
      token: accessToken,
    }
  }

  async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    /**
     * Set Bearer token authorization
     */
    request.header('Authorization', `Bearer ${accessToken}`)

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if needed)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    const body = await request.get()

    return {
      id: body.user.encodedId,
      nickName: body.user.displayName,
      name: body.user.fullName,
      email: null, // Fitbit doesn't provide email in profile endpoint
      emailVerificationState: 'unsupported' as const,
      avatarUrl: body.user.avatar640 || body.user.avatar150 || body.user.avatar || null,
      original: body.user,
      token: {
        token: accessToken,
        type: 'bearer' as const,
      },
    }
  }
}

/**
 * The factory function to reference the driver implementation
 * inside the "config/ally.ts" file.
 */
export function FitBitService(config: FitBitConfig): (ctx: HttpContext) => FitBit {
  return (ctx) => new FitBit(ctx, config)
}
