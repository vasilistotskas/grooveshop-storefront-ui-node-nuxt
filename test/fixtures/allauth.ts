import type { BadResponse } from '~~/shared/types/error/all-auth/400'
import type { NotAuthenticatedResponse } from '~~/shared/types/error/all-auth/401'
import type { EmailAddress, Flow, Provider, ProviderAccount, Session } from '~~/shared/types/model/all-auth'
import type { Authenticator } from '~~/shared/types/model/all-auth/account/authenticators/authenticators'
import type { SessionResponse } from '~~/shared/types/response/all-auth/auth/session'
import type { ConfigResponse } from '~~/shared/types/response/all-auth/config'
import { FIXTURE_TIMESTAMP } from './product'

/** `FIXTURE_TIMESTAMP` as allauth's epoch seconds (its `at` / `created_at` fields). */
export const FIXTURE_EPOCH = Date.parse(FIXTURE_TIMESTAMP) / 1000

type SessionUser = SessionResponse['data']['user']

/**
 * allauth's 200 for a signed-in session — what `GET /auth/session`
 * answers, and every step that completes a sign-in — valid against
 * `ZodSessionResponse` (proved by `test/unit/fixtures/allauth.spec.ts`).
 *
 * Defaults: user 7, `shopper@example.com`, with a usable password,
 * signed in by password at `FIXTURE_EPOCH`. `user` overrides merge into
 * that user; `methods` replaces the list.
 */
export function makeSessionResponse(
  overrides: { user?: Partial<SessionUser>, methods?: SessionResponse['data']['methods'] } = {},
): SessionResponse {
  const user: SessionUser = { id: 7, email: 'shopper@example.com', has_usable_password: true, ...overrides.user }

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
 * was sent), valid against `ZodNotAuthenticatedResponse`. `flow` adds to
 * the pending flow (`{ types: ['totp'] }` for an MFA step).
 */
export function makePendingFlowResponse(
  id: Flow['id'],
  flow: Omit<Partial<Flow>, 'id' | 'is_pending'> = {},
): NotAuthenticatedResponse {
  return {
    status: 401,
    data: { flows: [{ id, is_pending: true, ...flow }] },
    meta: { is_authenticated: false },
  }
}

/**
 * allauth's 400 for a refused form, one entry per field error, valid
 * against `ZodBadResponse`:
 *
 * ```ts
 * makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' })
 * ```
 */
export function makeBadResponse(...errors: BadResponse['errors']): BadResponse {
  return { status: 400, errors }
}

/**
 * allauth's `/config` answer, valid against `ZodConfigResponse`.
 *
 * Defaults: email sign-in open for sign-up, Google as the one social
 * provider (redirect flow), every MFA type with passkey login, no
 * session tracking. `data` overrides replace whole sections.
 */
export function makeAllAuthConfig(overrides: Partial<ConfigResponse['data']> = {}): ConfigResponse {
  return {
    status: 200,
    data: {
      account: { authentication_method: 'email', is_open_for_signup: true },
      socialaccount: { providers: [{ id: 'google', name: 'Google', flows: ['provider_redirect'] }] },
      mfa: { supported_types: ['totp', 'recovery_codes', 'webauthn'], passkey_login_enabled: true },
      usersessions: { track_activity: false },
      ...overrides,
    },
  }
}

const AUTHENTICATOR_DEFAULTS: Readonly<Record<Authenticator['type'], Partial<Authenticator>>> = {
  totp: {},
  webauthn: { id: 1, name: 'YubiKey 5C', is_passwordless: false },
  recovery_codes: { total_code_count: 10, unused_code_count: 10 },
}

/**
 * One of the shopper's second factors as `GET /account/authenticators`
 * lists it, valid against `ZodAuthenticator`: added at `FIXTURE_EPOCH`,
 * never used, with its type's own fields — a WebAuthn key (id 1,
 * "YubiKey 5C", a security key rather than a passkey) or ten unused
 * recovery codes. Overrides merge.
 */
export function makeAuthenticator(type: Authenticator['type'], overrides: Partial<Authenticator> = {}): Authenticator {
  return { type, created_at: FIXTURE_EPOCH, last_used_at: null, ...AUTHENTICATOR_DEFAULTS[type], ...overrides }
}

/** Chrome on Windows, the default session's browser. */
export const CHROME_ON_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

/**
 * One of the shopper's sessions as `GET /auth/sessions` lists it, valid
 * against `ZodSession`: id 1, Chrome on Windows, signed in at
 * `FIXTURE_EPOCH`, not the session in use, no activity tracked.
 * Overrides merge.
 */
export function makeAllAuthSession(overrides: Partial<Session> = {}): Session {
  return { id: 1, user_agent: CHROME_ON_WINDOWS, ip: '203.0.113.7', created_at: FIXTURE_EPOCH, is_current: false, ...overrides }
}

/**
 * One of the shopper's email addresses as `GET /account/email` lists
 * it, valid against `ZodEmailAddress`: the default user's, primary and
 * verified. Overrides merge.
 */
export function makeEmailAddress(overrides: Partial<EmailAddress> = {}): EmailAddress {
  return { email: 'shopper@example.com', primary: true, verified: true, ...overrides }
}

/**
 * A social provider as `/config` lists it, valid against `ZodProvider`:
 * Google with a client id (so a store can use it) and both flows.
 * Overrides merge.
 */
export function makeSocialProvider(overrides: Partial<Provider> = {}): Provider {
  return { id: 'google', name: 'Google', client_id: 'google-client-id', flows: ['provider_redirect', 'provider_token'], ...overrides }
}

/**
 * A social account linked to the shopper's, as `GET /account/providers`
 * lists it, valid against `ZodProviderAccount`: the default user's
 * Google account. `provider` overrides merge into `makeSocialProvider`.
 */
export function makeProviderAccount(
  overrides: Partial<Omit<ProviderAccount, 'provider'>> & { provider?: Partial<Provider> } = {},
): ProviderAccount {
  const { provider, ...account } = overrides
  return { uid: '104857600123', display: 'shopper@example.com', provider: makeSocialProvider(provider), ...account }
}

/** A `$fetch` error carrying an allauth body the Nuxt proxy re-threw. */
export interface ProxiedAllAuthError<T extends { status: number }> {
  statusCode: T['status']
  data: { statusCode: T['status'], data: T }
}

/**
 * `body` as the app's `$fetch` throws it: the Nuxt proxy re-throws
 * Django's allauth body with `createError({ data: body })`, so the error
 * carries Nitro's wrapper at `error.data` and the body at
 * `error.data.data` (see `extractAllAuthError` in `app/utils/auth.ts`).
 */
export function asProxiedError<T extends { status: number }>(body: T): ProxiedAllAuthError<T> {
  return { statusCode: body.status, data: { statusCode: body.status, data: body } }
}
