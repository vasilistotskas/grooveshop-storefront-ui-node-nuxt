import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

export const floorChoicesList: { name: FloorEnum, value: FloorEnum }[]
  = zFloorEnum.options.map(opt => ({
    name: opt,
    value: opt,
  }))

export const locationChoicesList: { name: LocationTypeEnum, value: LocationTypeEnum }[]
  = zLocationTypeEnum.options.map(opt => ({
    name: opt,
    value: opt,
  }))

export const defaultSelectOptionChoose = 'choose'

export const AuthenticatedRoutes = [
  'account',
  'account-2fa',
  'account-2fa-webauthn-add',
  'account-2fa-totp-activate',
  'account-2fa-totp-deactivate',
  'account-2fa-recovery-codes',
  'account-2fa-recovery-codes-generate',
  'account-2fa-webauthn',
  'account-2fa-webauthn-add',
  'account-addresses',
  'account-addresses-new',
  'account-addresses-id-edit',
  'account-email',
  'account-favourites-posts',
  'account-favourites-products',
  'account-help',
  'account-orders',
  'account-orders-id',
  'account-password-change',
  'account-providers',
  'account-reviews',
  'account-sessions',
  'account-settings',
] as const satisfies readonly (keyof RouteNamedMapI18n)[]

export const AuthenticatedRoutesSet = new Set<keyof RouteNamedMapI18n>(AuthenticatedRoutes)

export const THEME_COLORS = {
  themeDark: '#1a202c',
  themeLight: '#ffffff',
  backgroundDark: '#ffffff',
  backgroundLight: '#1a202c',
} as const

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
