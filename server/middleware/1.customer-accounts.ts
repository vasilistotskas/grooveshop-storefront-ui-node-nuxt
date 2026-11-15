import { createError, defineEventHandler } from 'nuxt/server'

/**
 * The storefront's surfaces that exist only for customer accounts: the
 * allauth proxy, the OAuth sign-in hand-off, the account's own routes
 * (profile, addresses, email preferences, notifications, the WebSocket
 * ticket, the account's subscriptions) and the RFC 9728 metadata that
 * points agents at the store's identity provider. Paths, matched on a
 * segment boundary.
 */
const CUSTOMER_ACCOUNT_PATHS = [
  '/api/_allauth',
  '/api/auth',
  '/auth',
  '/api/user',
  '/api/notification/user',
  '/api/websocket/user',
  '/api/subscriptions/user',
  '/.well-known/oauth-protected-resource',
] as const

/** nuxt-auth-utils' session route, which every page asks on the client. */
const SESSION_ROUTE = '/api/_auth/session'

const isCustomerAccountPath = (pathname: string) =>
  CUSTOMER_ACCOUNT_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))

/**
 * A store with customer accounts off (`features.customerAccounts`) has no
 * sign-in, no account and no identity provider: Django answers 404 on
 * all of them. The storefront answers the same 404 itself, the way a page
 * of a switched-off feature does, so it never asks Django for what Django
 * refuses (each refusal is a `feature_gate:refused`), and an agent reading
 * the protected-resource metadata is not sent to an authorization server
 * that is not there.
 *
 * Django no longer accepts a credential issued before the switch-off, so a
 * session holding one is ended (as a sign-out ends it) the first time the
 * app asks who the visitor is, and the visitor is answered as a guest.
 * A guest's session, which holds only their cart, is left alone.
 *
 * After `0.tenant.ts`, which resolves the store for every path here (none
 * is in its bypass list); a request without a store is not decided here.
 */
export default defineEventHandler(async (event) => {
  const tenant = event.context.tenant
  if (!tenant || storeFeatureOn(tenant, 'customerAccounts')) return

  const { pathname } = event.url
  if (pathname === SESSION_ROUTE && event.req.method === 'GET') {
    const session = await readUserSession(event)
    if (session.user || session.secure) await clearShopperSession(event)
    return {}
  }

  if (isCustomerAccountPath(pathname)) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }
})
