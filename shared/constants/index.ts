import { FloorChoicesEnum, LocationChoicesEnum, ScreenSizeEnum } from '#shared/types/enum'

export const locationChoicesList = Object.keys(LocationChoicesEnum)
  .filter(key => isNaN(Number(key)))
  .map(key => ({
    name: key,
    value: LocationChoicesEnum[key as keyof typeof LocationChoicesEnum],
  }))

export const floorChoicesList = Object.keys(FloorChoicesEnum)
  .filter(key => isNaN(Number(key)))
  .map(key => ({
    name: key,
    value: FloorChoicesEnum[key as keyof typeof FloorChoicesEnum],
  }))

export const defaultSelectOptionChoose = 'choose'

export const AuthenticatedRoutePrefixes = [
  '/account/2fa/totp',
  '/account/2fa/recovery-codes',
  '/account/addresses',
  '/account/favourites',
  '/account/help',
  '/account/orders',
  '/account/providers',
  '/account/reviews',
  '/account/sessions',
  '/account/settings',
  '/account/2fa/reauthenticate',
] as const

export const AuthenticatedRoutes = [
  '/account',
  '/account/2fa',
  '/account/email',
  '/account/reauthenticate',
] as const

export const THEME_COLORS = {
  themeDark: '#1a202c',
  themeLight: '#ffffff',
  backgroundDark: '#ffffff',
  backgroundLight: '#1a202c',
} as const

export const defaultScreenConfig = {
  [ScreenSizeEnum.SMALL]: 576,
  [ScreenSizeEnum.MEDIUM]: 768,
  [ScreenSizeEnum.LARGE]: 992,
  [ScreenSizeEnum.EXTRA_LARGE]: 1200,
} as const

export const AuthProcess = {
  LOGIN: 'login',
  CONNECT: 'connect',
} as const

export const URLs = {
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
