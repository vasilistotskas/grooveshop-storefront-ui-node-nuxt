import type { RouteMapI18n } from 'vue-router'

// Route NAMES, so they live with the app's typed routes: `RouteMapI18n`
// exists only in the app context, and `satisfies` checks every entry
// against it.

// The pages that confirm a signed-in shopper before a security change:
// the password one and the three second-factor ones. allauth answers every
// one of their requests with 401 unless the shopper is signed in
// (`AuthenticatedAPIView`), so they sit behind sign-in — a guest who lands
// on one goes to the sign-in page instead of a form that cannot work. They
// are drawn like the sign-in pages: one question, nothing else on screen.
export const ReauthenticateRoutes = [
  'account-reauthenticate',
  'account-2fa-reauthenticate-totp',
  'account-2fa-reauthenticate-webauthn',
  'account-2fa-reauthenticate-recovery-codes',
] as const satisfies readonly (keyof RouteMapI18n)[]

export const AuthenticatedRoutes = [
  'account',
  'account-2fa',
  'account-2fa-totp-activate',
  'account-2fa-totp-deactivate',
  'account-2fa-recovery-codes',
  'account-2fa-recovery-codes-generate',
  'account-2fa-webauthn',
  'account-2fa-webauthn-add',
  'account-addresses',
  'account-addresses-new',
  'account-addresses-id-edit',
  'account-business',
  'account-email',
  'account-favourites-posts',
  'account-favourites-products',
  'account-gift-cards',
  'account-loyalty',
  'account-notifications',
  'account-orders',
  'account-orders-id',
  'account-password-change',
  'account-providers',
  'account-reviews',
  'account-sessions',
  'account-settings',
  'account-settings-privacy',
  'account-subscriptions',
  ...ReauthenticateRoutes,
  // Cart recovery from the abandoned-cart email only makes sense for
  // authenticated shoppers (the email task filters ``user__isnull=False``),
  // so we gate the route behind auth — a logged-out click routes
  // through login with ``next=/cart/recover/<uuid>`` and lands back
  // here after sign-in.
  'cart-recover-uuid',
] as const satisfies readonly (keyof RouteMapI18n)[]

export const AuthenticatedRoutesSet = new Set<keyof RouteMapI18n>(AuthenticatedRoutes)

// Routes that live under /account/* but are part of an *unauthenticated*
// flow (login, signup, OAuth callback, email/password reset, MFA challenge).
// `default.vue` uses this to suppress the user-account chrome (sidebar +
// avatar banner) on these pages, because otherwise a logged-in user who
// somehow lands on /account/login would see their account UI wrapped
// around the login form.
export const AuthFlowRoutes = [
  'account-login',
  'account-login-code',
  'account-login-code-confirm',
  'account-signup',
  'account-signup-passkey',
  'account-signup-passkey-create',
  'account-provider-callback',
  'account-provider-signup',
  'account-verify-email',
  'account-verify-email-key',
  'account-password-reset',
  'account-password-reset-key-key',
  'account-2fa-authenticate-totp',
  'account-2fa-authenticate-webauthn',
  'account-2fa-authenticate-recovery-codes',
] as const satisfies readonly (keyof RouteMapI18n)[]

export const AuthFlowRoutesSet = new Set<keyof RouteMapI18n>(AuthFlowRoutes)

export const isRouteProtected = (route: string) => {
  return AuthenticatedRoutesSet.has(route as keyof RouteMapI18n)
}

export const isAuthFlowRoute = (route: string) => {
  return AuthFlowRoutesSet.has(route as keyof RouteMapI18n)
}

const AuthPageRoutesSet = new Set<keyof RouteMapI18n>([...AuthFlowRoutes, ...ReauthenticateRoutes])

/** A sign-in, sign-up or re-authentication page: the `auth` kind of layout. */
export const isAuthPageRoute = (route: string) => {
  return AuthPageRoutesSet.has(route as keyof RouteMapI18n)
}
