import { object, string, number, boolean, array, union, literal, enum as zEnum, optional } from 'zod'
import type { AllAuthResponse } from '~/types/all-auth/response'

export const ZodProvider = object({
  id: string().describe('The provider ID.'),
  name: string().describe('The name of the provider.'),
  client_id: optional(string()).describe('The client ID (in case of OAuth2 or OpenID Connect based providers).'),
  flows: array(zEnum(['provider_redirect', 'provider_token'])).describe(
    'Items Enum: "provider_redirect" "provider_token"\nThe authentication flows the provider integration supports.',
  ),
})

export const ZodMethods = array(
  object({
    method: zEnum(['password', 'socialaccount', 'mfa', 'code']),
    at: number().describe('An epoch based timestamp (trivial to parse using: new Date(value) * 1000)'),
    email: optional(string().email()).describe('The email address.'),
    username: optional(string()).describe('The username.'),
    reauthenticated: optional(boolean()),
    provider: optional(string()).describe('The provider ID.'),
    uid: optional(string()).describe('The provider specific account ID.'),
    type: optional(string()).describe('Enum: "recovery_codes" "totp"\nThe type of authenticator.'),
  }),
).describe('A list of methods used to authenticate.')

export const ZodUser = object({
  id: union([string(), number()]).describe('The user ID.'),
  display: optional(string()).describe('The display name for the user.'),
  has_usable_password: optional(boolean()).describe('Whether or not the account has a password set.'),
  email: optional(string().email()).describe('The email address.'),
  username: optional(string()).describe('The username.'),
})

export const ZodAuthenticationMeta = object({
  session_token: optional(string()).describe('The session token (app clients only).'),
  access_token: optional(string()).describe('The access token (app clients only).'),
  is_authenticated: optional(boolean()),
}).describe('Metadata available in an authentication related response.')

export const ZodUnauthenticatedMeta = object({
  session_token: optional(string()).describe('The session token (app clients only).'),
  access_token: optional(string()).describe('The access token (app clients only).'),
  is_authenticated: boolean().nullable(),
}).describe('Metadata available in an unauthenticated response.')

export const ZodProviderToken = object({
  client_id: string().describe('The client ID (in case of OAuth2 or OpenID Connect based providers)'),
  id_token: optional(string()).describe('The ID token.'),
  access_token: optional(string()).describe('The access token.'),
})

export const ZodSession = object({
  user_agent: string(),
  ip: string(),
  created_at: number(),
  is_current: boolean(),
  id: number(),
  last_seen_at: optional(number()),
})

export const ZodFlow = object({
  id: zEnum([
    'verify_email',
    'login',
    'login_by_code',
    'signup',
    'provider_redirect',
    'provider_signup',
    'provider_token',
    'reauthenticate',
    'mfa_reauthenticate',
    'mfa_authenticate',
    'mfa_login_webauthn',
    'mfa_reauthenticate_webauthn',
    'mfa_signup_webauthn',
  ]),
  provider: optional(ZodProvider),
  is_pending: optional(boolean()),
  types: optional(array(zEnum(['totp', 'recovery_codes', 'webauthn']))),
})

export const ZodAuthenticated = object({
  user: ZodUser,
  methods: ZodMethods,
  flows: optional(array(ZodFlow)),
})

export const ZodTOTPAuthenticator = object({
  last_used_at: number().nullable().describe('An epoch based timestamp (trivial to parse using: new Date(value) * 1000)'),
  created_at: number().describe('An epoch based timestamp (trivial to parse using: new Date(value) * 1000)'),
  type: literal('totp'),
})

export const ZodEmailAddress = object({
  email: string().email().describe('The email address.'),
  primary: boolean(),
  verified: boolean(),
})

export const ZodProviderAccount = object({
  uid: string().describe('The provider specific account ID.'),
  display: string().describe('A name derived from the third-party provider account data.'),
  provider: object({
    id: string().describe('The provider ID.'),
    name: string().describe('The name of the provider.'),
    client_id: optional(string()).describe('The client ID (in case of OAuth2 or OpenID Connect based providers)'),
    flows: array(zEnum(['provider_redirect', 'provider_token'])).describe(
      'Items Enum: "provider_redirect" "provider_token"\nThe authentication flows the provider integration supports.',
    ),
  }),
})

export const AuthProcess = {
  LOGIN: 'login',
  CONNECT: 'connect',
} as const

export const URLs = {
  LOGIN_URL: '/account/login',
  LOGIN_REDIRECT_URL: '/account',
  LOGOUT_REDIRECT_URL: '/',
} as const

export const Flows = {
  VERIFY_EMAIL: 'verify_email',
  LOGIN: 'login',
  LOGIN_BY_CODE: 'login_by_code',
  SIGNUP: 'signup',
  PROVIDER_REDIRECT: 'provider_redirect',
  PROVIDER_SIGNUP: 'provider_signup',
  MFA_AUTHENTICATE: 'mfa_authenticate',
  REAUTHENTICATE: 'reauthenticate',
  MFA_REAUTHENTICATE: 'mfa_reauthenticate',
  MFA_WEBAUTHN_SIGNUP: 'mfa_signup_webauthn',
} as const

export const AuthenticatorType = {
  TOTP: 'totp',
  RECOVERY_CODES: 'recovery_codes',
  WEBAUTHN: 'webauthn',
} as const

export type AuthenticatorTypeKeys = keyof typeof AuthenticatorType
export type AuthenticatorTypeValues = (typeof AuthenticatorType)[AuthenticatorTypeKeys]

export const Flow2path = {
  [Flows.LOGIN]: '/account/login',
  [Flows.LOGIN_BY_CODE]: '/account/login/code/confirm',
  [Flows.SIGNUP]: '/account/signup',
  [Flows.VERIFY_EMAIL]: '/account/verify-email',
  [Flows.PROVIDER_SIGNUP]: '/account/provider/signup',
  [Flows.REAUTHENTICATE]: '/account/reauthenticate',
  [Flows.MFA_WEBAUTHN_SIGNUP]: '/account/signup/passkey/create',
  [`${Flows.MFA_AUTHENTICATE}:${AuthenticatorType.TOTP}`]: '/account/2fa/authenticate/totp',
  [`${Flows.MFA_AUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: '/account/2fa/authenticate/recovery-codes',
  [`${Flows.MFA_AUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: '/account/2fa/authenticate/webauthn',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: '/account/2fa/reauthenticate/totp',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: '/account/2fa/reauthenticate/recovery-codes',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: '/account/2fa/reauthenticate/webauthn',
} as const

export const AuthChangeEvent = Object.freeze({
  LOGGED_OUT: 'LOGGED_OUT',
  LOGGED_IN: 'LOGGED_IN',
  REAUTHENTICATED: 'REAUTHENTICATED',
  REAUTHENTICATION_REQUIRED: 'REAUTHENTICATION_REQUIRED',
  FLOW_UPDATED: 'FLOW_UPDATED',
})

export type AuthInfo = {
  isAuthenticated: boolean
  requiresReauthentication: boolean
  user: AllAuthResponse['data']['user'] | null
  pendingFlow: Flow | null
}

export type Provider = typeof ZodProvider._type
export type ProviderToken = typeof ZodProviderToken._type
export type Session = typeof ZodSession._type
export type Flow = typeof ZodFlow._type
export type FlowId = keyof typeof Flow2path
export type AuthChangeEventType = typeof AuthChangeEvent[keyof typeof AuthChangeEvent] | null
