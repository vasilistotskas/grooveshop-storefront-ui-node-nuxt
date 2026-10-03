import { describe, it, expect } from 'vitest'
import { AuthFlowRoutes, AuthenticatedRoutes, ReauthenticateRoutes, isAuthFlowRoute, isAuthPageRoute, isRouteProtected } from '~/utils/route'
import { RedirectToURLs } from '~~/shared/constants'

/**
 * `isRouteProtected` is what `auth.global.ts` bounces a guest on, and
 * `isAuthFlowRoute` is what `default.vue` strips the account chrome
 * on. Both take a route's BASE name — `$routeBaseName` has already
 * dropped the `___<locale>` suffix.
 */
describe('isRouteProtected', () => {
  it.each([
    ['account'],
    ['account-orders-id'],
    ['account-addresses-id-edit'],
    // Reached from the abandoned-cart email, outside /account.
    ['cart-recover-uuid'],
  ])('protects %s', (name) => {
    expect(isRouteProtected(name)).toBe(true)
  })

  it.each([
    ['index'],
    ['products-id-slug'],
    ['cart'],
    ['checkout'],
    ['account-login'],
  ])('leaves %s public', (name) => {
    expect(isRouteProtected(name)).toBe(false)
  })

  it('matches base names only, not locale-suffixed route names', () => {
    expect(isRouteProtected('account___el')).toBe(false)
  })

  it('never protects the page a guest is sent to, or the redirect would loop', () => {
    expect(isRouteProtected(RedirectToURLs.LOGIN_URL)).toBe(false)
  })

  it('never protects a sign-in flow step: a guest must be able to finish logging in', () => {
    expect(AuthFlowRoutes.filter(name => isRouteProtected(name))).toEqual([])
  })
})

describe('isAuthFlowRoute', () => {
  it.each([
    ['account-login'],
    ['account-provider-callback'],
    ['account-2fa-authenticate-totp'],
  ])('recognises %s as a sign-in flow step', (name) => {
    expect(isAuthFlowRoute(name)).toBe(true)
  })

  it('does not treat an account page as a flow step', () => {
    expect(AuthenticatedRoutes.filter(name => isAuthFlowRoute(name))).toEqual([])
  })
})

describe('isAuthPageRoute', () => {
  it('covers every sign-in flow step and every re-authentication page', () => {
    expect([...AuthFlowRoutes, ...ReauthenticateRoutes].filter(name => !isAuthPageRoute(name))).toEqual([])
  })

  it.each([
    ['account'],
    ['account-orders'],
    ['account-password-change'],
    ['index'],
  ])('leaves %s in its own layout', (name) => {
    expect(isAuthPageRoute(name)).toBe(false)
  })
})
