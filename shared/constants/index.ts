export const ALLAUTH_API_PREFIX = '/api/_allauth/app/v1' as const
export const ALLAUTH_AUTH_URL = `${ALLAUTH_API_PREFIX}/auth` as const
export const ALLAUTH_ACCOUNT_URL = `${ALLAUTH_API_PREFIX}/account` as const
export const ALLAUTH_CONFIG_URL = `${ALLAUTH_API_PREFIX}/config` as const

export const defaultSelectOptionChoose = 'choose'

export const GSIAuthProcess = {
  LOGIN: 'login',
  CONNECT: 'connect',
} as const

export const RedirectToURLs = {
  LOGIN_URL: 'account-login',
  LOGIN_REDIRECT_URL: 'account',
  LOGOUT_REDIRECT_URL: 'index',
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

// Preference order when more than one authenticator is enabled: prefer the
// security key (phishing-resistant, one-tap on supported devices), then the
// authenticator app, with recovery codes last as a break-glass option.
export const AUTHENTICATOR_TYPE_PRIORITY = [
  AuthenticatorType.WEBAUTHN,
  AuthenticatorType.TOTP,
  AuthenticatorType.RECOVERY_CODES,
] as const satisfies readonly AuthenticatorTypeValues[]

export const Flow2path = {
  [Flows.LOGIN]: 'account-login',
  [Flows.LOGIN_BY_CODE]: 'account-login-code-confirm',
  [Flows.SIGNUP]: 'account-signup',
  [Flows.VERIFY_EMAIL]: 'account-verify-email',
  [Flows.PROVIDER_SIGNUP]: 'account-provider-signup',
  [Flows.REAUTHENTICATE]: 'account-reauthenticate',
  [Flows.MFA_WEBAUTHN_SIGNUP]: 'account-signup-passkey-create',
  [`${Flows.MFA_AUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'account-2fa-authenticate-totp',
  [`${Flows.MFA_AUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'account-2fa-authenticate-recovery-codes',
  [`${Flows.MFA_AUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'account-2fa-authenticate-webauthn',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'account-2fa-reauthenticate-totp',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'account-2fa-reauthenticate-recovery-codes',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'account-2fa-reauthenticate-webauthn',
} as const

export const AuthChangeEvent = Object.freeze({
  LOGGED_OUT: 'LOGGED_OUT',
  LOGGED_IN: 'LOGGED_IN',
  REAUTHENTICATED: 'REAUTHENTICATED',
  REAUTHENTICATION_REQUIRED: 'REAUTHENTICATION_REQUIRED',
  FLOW_UPDATED: 'FLOW_UPDATED',
})
