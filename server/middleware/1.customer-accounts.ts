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

/** A page the browser itself loads (not the app's `/api`, not an asset). */
const isPageRequest = (event: { req: Request, url: URL }) =>
  event.req.method === 'GET'
  && !event.url.pathname.startsWith('/api/')
  && (event.req.headers.get('accept') ?? '').includes('text/html')

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
 * Django no longer accepts a credential issued before the switch-off. The
 * session route answers every visitor as a guest, and a session that still
 * holds a signed-in shopper or their tokens loses them on the next page the
 * browser loads (`isPageRequest`): the page's own response is the one the
 * browser keeps a cookie from, while the session the SSR render asks for
 * travels through an internal fetch whose `Set-Cookie` never leaves the
 * server. Only the identity goes (`dropSignedInIdentity`): the cart and
 * anything else in the session stay, so a guest cart built since the
 * switch-off survives, and no API request rewrites the session beside a
 * cart write in flight.
 *
 * After `0.tenant.ts`, which resolves the store for every path here (none
 * is in its bypass list); a request without a store is not decided here.
 */
export default defineEventHandler(async (event) => {
  const tenant = event.context.tenant
  if (!tenant || storeFeatureOn(tenant, 'customerAccounts')) return

  const { pathname } = event.url
  if (pathname === SESSION_ROUTE && event.req.method === 'GET') return {}

  if (isPageRequest(event)) {
    const session = await readUserSession(event)
    if (session.user || session.secure) await dropSignedInIdentity(event)
  }

  if (isCustomerAccountPath(pathname)) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }
})
