export const ALLAUTH_API_PREFIX = '/api/_allauth/app/v1' as const
export const ALLAUTH_AUTH_URL = `${ALLAUTH_API_PREFIX}/auth` as const
export const ALLAUTH_ACCOUNT_URL = `${ALLAUTH_API_PREFIX}/account` as const
export const ALLAUTH_CONFIG_URL = `${ALLAUTH_API_PREFIX}/config` as const

export const defaultSelectOptionChoose = 'choose'

/**
 * Encoder quality of the product zoom's PNG (`ImageModal`), the one product
 * image that is not AVIF. Every AVIF photograph (cards, gallery, variant
 * thumbnails) asks for no quality of its own: AVIF's is the media service's
 * ceiling (`MEDIA_STREAM_AVIF_QUALITY`).
 */
export const PRODUCT_IMAGE_QUALITY = 75

/**
 * The id of a blog post's comments section: the comments button and the
 * cards' comments links jump to it. The page used to pass its own id to
 * the section, which replaced this one, so neither found it.
 */
export const BLOG_POST_COMMENTS_ID = 'blog-post-comments'

/**
 * Most product ids one favourites lookup asks about: Django's
 * `ProductFavouriteByProductsRequestSerializer` refuses more (`max_length=100`,
 * the generated `zGetProductFavouritesByProductsBody`), so a page drawing
 * more hearts asks in several requests (`lookUpFavourites` in the user store).
 */
export const FAVOURITES_LOOKUP_MAX_IDS = 100

/**
 * A product the server says is a favourite (`already_favourited`) before we
 * know the favourite's id: its heart is pressed, and a removal asks for the
 * id first (`resolveFavouriteId` in the user store).
 */
export const FAVOURITE_ID_UNKNOWN = 'unknown'

/** What the user store holds for a favourite product: its favourite's id, or that it has one. */
export type FavouriteId = number | typeof FAVOURITE_ID_UNKNOWN

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
  REAUTHENTICATE_BY_CODE: 'reauthenticate_by_code',
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
  [Flows.REAUTHENTICATE_BY_CODE]: 'account-reauthenticate-code',
  // The code is on its way: the step that takes it (a pending flow only).
  [`${Flows.REAUTHENTICATE_BY_CODE}:pending`]: 'account-reauthenticate-code-confirm',
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

// The box of the social-card rendition every og:image of an uploaded image
// asks the media service for (`useOgImage`), a contract size the service
// answers exactly. The size a page states is the one it is served at
// (`servedCoverSize`): smaller than the box when the source is.
export const OG_IMAGE_BOX = { width: 1200, height: 630 } as const

// Where the media service cuts a blog post's cover to a shape: the page's
// cover in every design, its og:image and its schema.org images ask for the
// same one, so every rendition shows the same part of the photograph.
export const BLOG_COVER_CROP_POSITION = 'attention'

// The Article's images, in the order Google lists the shapes it asks for
// (16:9, 4:3, 1:1): the boxes asked for, contract sizes of the media service.
// The first is the page's primary image. Each ImageObject states the size it
// is served at (`servedCoverSize`), narrower than its box when the cover is.
export const ARTICLE_IMAGE_SIZES = [
  { width: 1200, height: 675 },
  { width: 1200, height: 900 },
  { width: 1200, height: 1200 },
] as const
