import type {
  AllAuthAuthenticatedResponse,
  AllAuthAuthenticatorList,
  AllAuthAuthenticationResponse,
  AllAuthEmailAddress,
  AllAuthErrorResponse,
  AllAuthFlow,
  AllAuthProvider,
  AllAuthProviderAccount,
  AllAuthSession,
  GetAllauthAppV1ConfigResponse,
} from '~~/shared/openapi-allauth/types.gen'
import { FIXTURE_TIMESTAMP } from './product'

/** `FIXTURE_TIMESTAMP` as allauth's epoch seconds (its `at` / `created_at` fields). */
export const FIXTURE_EPOCH = Date.parse(FIXTURE_TIMESTAMP) / 1000

type SessionUser = AllAuthAuthenticatedResponse['data']['user']

/**
 * allauth's 200 for a signed-in session — what `GET /auth/session`
 * answers, and every step that completes a sign-in — valid against
 * `zAllAuthAuthenticatedResponse` (proved by `test/unit/fixtures/allauth.spec.ts`).
 *
 * Defaults: user 7, `shopper@example.com`, with a usable password,
 * signed in by password at `FIXTURE_EPOCH`. `user` overrides merge into
 * that user; `methods` replaces the list.
 */
export function makeSessionResponse(
  overrides: { user?: Partial<SessionUser>, methods?: AllAuthAuthenticatedResponse['data']['methods'] } = {},
): AllAuthAuthenticatedResponse {
  const user: SessionUser = { id: 7, display: 'Shopper', email: 'shopper@example.com', has_usable_password: true, ...overrides.user }

  return {
    status: 200,
    data: {
      user,
      methods: overrides.methods ?? [{ method: 'password', at: FIXTURE_EPOCH, email: user.email }],
    },
    meta: { is_authenticated: true },
  }
}

/**
 * allauth's 401 for a visitor with one flow pending — the "next step"
 * answer (`verify_email` after sign-up, `mfa_authenticate` after a
 * correct password on a two-factor account, `login_by_code` after a code
 * was sent), valid against `zAllAuthAuthenticationResponse`. `flow` adds to
 * the pending flow (`{ types: ['totp'] }` for an MFA step).
 */
export function makePendingFlowResponse(
  id: AllAuthFlow['id'],
  flow: Omit<Partial<AllAuthFlow>, 'id' | 'is_pending'> = {},
): AllAuthAuthenticationResponse {
  return {
    status: 401,
    data: { flows: [{ id, is_pending: true, ...flow }] },
    meta: { is_authenticated: false },
  }
}

/**
 * allauth's 400 for a refused form, one entry per field error, valid
 * against `zAllAuthErrorResponse`:
 *
 * ```ts
 * makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' })
 * ```
 */
export function makeBadResponse(...errors: NonNullable<AllAuthErrorResponse['errors']>): AllAuthErrorResponse {
  return { status: 400, errors }
}

/**
 * allauth's `/config` answer, valid against `zGetAllauthAppV1ConfigResponse`.
 *
 * Defaults: email sign-in open for sign-up, Google as the one social
 * provider (redirect flow), every MFA type with passkey login, no
 * session tracking. `data` overrides replace whole sections.
 */
export function makeAllAuthConfig(overrides: Partial<GetAllauthAppV1ConfigResponse['data']> = {}): GetAllauthAppV1ConfigResponse {
  return {
    status: 200,
    data: {
      account: { authentication_method: 'email', is_open_for_signup: true, email_verification_by_code_enabled: true, login_by_code_enabled: true },
      socialaccount: { providers: [{ id: 'google', name: 'Google', flows: ['provider_redirect'] }] },
      mfa: { supported_types: ['totp', 'recovery_codes', 'webauthn'], passkey_login_enabled: true },
      usersessions: { track_activity: false },
      ...overrides,
    },
  }
}

type Authenticator = AllAuthAuthenticatorList[number]
type AuthenticatorOf<T extends Authenticator['type']> = Extract<Authenticator, { type: T }>

const AUTHENTICATOR_DEFAULTS: { [T in Authenticator['type']]: Partial<AuthenticatorOf<T>> } = {
  totp: {},
  webauthn: { id: 1, name: 'YubiKey 5C', is_passwordless: false },
  recovery_codes: { total_code_count: 10, unused_code_count: 10 },
}

/**
 * One of the shopper's second factors as `GET /account/authenticators`
 * lists it, valid against `zAllAuthAuthenticatorList`: added at `FIXTURE_EPOCH`,
 * never used, with its type's own fields — a WebAuthn key (id 1,
 * "YubiKey 5C", a security key rather than a passkey) or ten unused
 * recovery codes. Overrides merge.
 */
export function makeAuthenticator<T extends Authenticator['type']>(
  type: T,
  overrides: Partial<AuthenticatorOf<T>> = {},
): AuthenticatorOf<T> {
  return { type, created_at: FIXTURE_EPOCH, last_used_at: null, ...AUTHENTICATOR_DEFAULTS[type], ...overrides } as AuthenticatorOf<T>
}

/** Chrome on Windows, the default session's browser. */
export const CHROME_ON_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

/**
 * One of the shopper's sessions as `GET /auth/sessions` lists it, valid
 * against `zAllAuthSession`: id 1, Chrome on Windows, signed in at
 * `FIXTURE_EPOCH`, not the session in use, no activity tracked.
 * Overrides merge.
 */
export function makeAllAuthSession(overrides: Partial<AllAuthSession> = {}): AllAuthSession {
  return { id: 1, user_agent: CHROME_ON_WINDOWS, ip: '203.0.113.7', created_at: FIXTURE_EPOCH, is_current: false, ...overrides }
}

/**
 * One of the shopper's email addresses as `GET /account/email` lists
 * it, valid against `zAllAuthEmailAddress`: the default user's, primary and
 * verified. Overrides merge.
 */
export function makeEmailAddress(overrides: Partial<AllAuthEmailAddress> = {}): AllAuthEmailAddress {
  return { email: 'shopper@example.com', primary: true, verified: true, ...overrides }
}

/**
 * A social provider as `/config` lists it, valid against `zAllAuthProvider`:
 * Google with a client id (so a store can use it) and both flows.
 * Overrides merge.
 */
export function makeSocialProvider(overrides: Partial<AllAuthProvider> = {}): AllAuthProvider {
  return { id: 'google', name: 'Google', client_id: 'google-client-id', flows: ['provider_redirect', 'provider_token'], ...overrides }
}

/**
 * A social account linked to the shopper's, as `GET /account/providers`
 * lists it, valid against `zAllAuthProviderAccount`: the default user's
 * Google account. `provider` overrides merge into `makeSocialProvider`.
 */
export function makeProviderAccount(
  overrides: Partial<Omit<AllAuthProviderAccount, 'provider'>> & { provider?: Partial<AllAuthProvider> } = {},
): AllAuthProviderAccount {
  const { provider, ...account } = overrides
  return { uid: '104857600123', display: 'shopper@example.com', provider: makeSocialProvider(provider), ...account }
}

/** A `$fetch` error carrying an allauth body the Nuxt proxy re-threw. */
export interface ProxiedAllAuthError<T extends { status?: number }> {
  statusCode: T['status']
  data: { statusCode: T['status'], data: T }
}

/**
 * `body` as the app's `$fetch` throws it: the Nuxt proxy re-throws
 * Django's allauth body with `createError({ data: body })`, so the error
 * carries Nitro's wrapper at `error.data` and the body at
 * `error.data.data` (see `extractAllAuthError` in `app/utils/auth.ts`).
 */
export function asProxiedError<T extends { status?: number }>(body: T): ProxiedAllAuthError<T> {
  return { statusCode: body.status, data: { statusCode: body.status, data: body } }
}
