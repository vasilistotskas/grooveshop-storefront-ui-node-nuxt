import { deleteCookie, getCookie, getRequestProtocol, setCookie } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import type { UserSession } from '#auth-utils'

interface CartSessionData {
  // Cart UUID — the public identifier on the X-Cart-Id header. Switched
  // from the sequential integer PK so the namespace is non-enumerable
  // (M18 in MULTI_TENANT_AUDIT.md).
  cartId?: string
}

// Fallback cookie stores the bare cart UUID so we can recover if the
// encrypted ``nuxt-auth-session`` cookie is cleared/rotated mid-browse. The
// value is non-sensitive — it's just a lookup key the backend already
// validates against the X-Cart-Id permission path.
const CART_ID_FALLBACK_COOKIE = 'cart-id'
const CART_ID_MAX_AGE = 60 * 60 * 24 * 30

// RFC 4122 UUID format — accept hyphenated lowercase or uppercase. The
// backend rejects malformed values at the serializer layer too, but
// validating here keeps a corrupt cookie from being echoed back into
// every outbound request.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidCartUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

// The cart lives in nuxt-auth-utils' `nuxt-auth-session`, beside the signed-in
// user: one sealed cookie, one key derived from `appSecret`. A cart
// write seals it with the cart's own cookie lifetime.
const CART_SESSION_CONFIG = {
  cookie: {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    maxAge: CART_ID_MAX_AGE,
  },
} as const

function readFallbackCartId(event: RequestEvent): string | undefined {
  const raw = getCookie(event, CART_ID_FALLBACK_COOKIE)
  return isValidCartUuid(raw) ? raw : undefined
}

function writeFallbackCartId(event: RequestEvent, cartId: string | undefined): void {
  if (cartId === undefined) {
    deleteCookie(event, CART_ID_FALLBACK_COOKIE, { path: '/' })
    return
  }
  setCookie(event, CART_ID_FALLBACK_COOKIE, cartId, {
    httpOnly: false,
    secure: !import.meta.dev,
    sameSite: 'lax',
    maxAge: CART_ID_MAX_AGE,
    path: '/',
  })
}

/**
 * Whether the request's store has customer accounts off: Django no longer
 * accepts the signed-in identity a session from before the switch-off
 * still holds (`server/middleware/1.customer-accounts.ts`).
 */
export function customerAccountsOff(event: RequestEvent): boolean {
  const tenant = event.context.tenant
  return Boolean(tenant) && !storeFeatureOn(tenant, 'customerAccounts')
}

/** The session without the signed-in shopper (`user`) and their tokens (`secure`). */
function withoutIdentity({ user: _user, secure: _secure, id: _id, ...rest }: Awaited<ReturnType<typeof getUserSession>>) {
  return rest
}

/**
 * Write the cart's part of the session, with the cart's own cookie
 * lifetime. On a store with customer accounts off the write also leaves the
 * identity out. A cart write can reach the browser after the page response
 * that dropped the identity (`dropSignedInIdentity`), from a session it read
 * before that drop. Carrying the identity back would undo the drop; leaving
 * it out means whichever of the two lands last carries no identity, and
 * the newest cart is named by the session or the `cart-id` cookie.
 */
async function sealCartSession(event: RequestEvent, updates: Partial<CartSessionData>): Promise<void> {
  if (customerAccountsOff(event)) {
    await replaceUserSession(event, { ...withoutIdentity(await getUserSession(event)), ...updates }, CART_SESSION_CONFIG)
    return
  }
  if ('cartId' in updates && updates.cartId === undefined) {
    // `setUserSession` merges with defu, which skips an undefined value
    // and so keeps the old id; the session is rewritten without it. It
    // must stay otherwise intact: `nuxt-auth-session` also holds the
    // signed-in user.
    const current = await getUserSession(event)
    await replaceUserSession(event, { ...current, cartId: undefined }, CART_SESSION_CONFIG)
    return
  }
  await setUserSession(event, updates, CART_SESSION_CONFIG)
}

export async function getCartSession(event: RequestEvent): Promise<CartSessionData> {
  const { cartId } = await readUserSession(event)
  if (cartId) return { cartId }
  const fallbackId = readFallbackCartId(event)
  if (fallbackId) {
    // Reconciliation: re-attach the fallback id to the session so subsequent
    // requests read the primary cookie and the fallback stays a pure spare.
    await sealCartSession(event, { cartId: fallbackId })
    return { cartId: fallbackId }
  }
  return {}
}

export async function updateCartSession(event: RequestEvent, updates: Partial<CartSessionData>): Promise<void> {
  await sealCartSession(event, updates)

  if ('cartId' in updates && updates.cartId === undefined) {
    writeFallbackCartId(event, undefined)
  }
  else if ('cartId' in updates && isValidCartUuid(updates.cartId)) {
    writeFallbackCartId(event, updates.cartId)
  }
}

/**
 * What names the visitor's cart to Django: the guest cart's UUID
 * (`X-Cart-Id`) and the signed-in shopper's access token
 * (`Authorization`), whichever the request has. Empty for a visitor with
 * neither, whose request Django answers without a cart.
 */
export async function getCartIdentityHeaders(event: RequestEvent, cartIdOverride?: string): Promise<Record<string, string>> {
  const { cartId } = await getCartSession(event)
  // Callers that need to address a cart other than the current session's
  // (e.g. the /cart/claim handoff, which must probe an agent-issued UUID
  // before ever writing it to the session) pass an explicit override.
  const effectiveCartId = cartIdOverride ?? cartId
  const accessToken = await getAllAuthAccessToken(event)
  const headers: Record<string, string> = {}

  if (effectiveCartId) {
    headers['X-Cart-Id'] = String(effectiveCartId)
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

export async function getCartHeaders(event: RequestEvent, cartIdOverride?: string): Promise<Record<string, string>> {
  return {
    'X-Forwarded-Proto': getRequestProtocol(event, { xForwardedProto: true }),
    // Tenant resolution — prefer the actual request host so cart
    // operations hit the caller's tenant schema. Falls back to the
    // configured Django hostname outside request context.
    'X-Forwarded-Host': requestTenantHost(event),
    'X-Language': requestLocale(event),
    ...await getCartIdentityHeaders(event, cartIdOverride),
  }
}

export async function handleCartResponse(event: RequestEvent, response: unknown): Promise<void> {
  if (
    response
    && typeof response === 'object'
    && 'uuid' in response
    && isValidCartUuid(response.uuid)
  ) {
    await updateCartSession(event, { cartId: response.uuid })
  }
}

export async function clearCartSession(event: RequestEvent): Promise<void> {
  await updateCartSession(event, { cartId: undefined })
}

/**
 * Take the signed-in shopper (`user`), their tokens (`secure`) and the
 * session's cart id out of the session, keeping the rest (the posts already
 * counted) with `updates` over it. For a store that switched customer
 * accounts off (`server/middleware/1.customer-accounts.ts`): Django no
 * longer accepts those tokens. Every session write on such a store that is
 * not a cart write goes through here: the page request that ends the
 * identity, and the blog's view count.
 *
 * The cart id goes too because such a write seals the session as it read it
 * when its request began, and a cart write from another tab can reach the
 * browser before it: writing that older id back would take the newer cart
 * away, and writing the identity back would undo the drop. Nothing is lost: every cart write also
 * sets the `cart-id` spare cookie, which this leaves alone and
 * `getCartSession` re-attaches on the next request, whether it names a
 * guest cart or a pre-switch user cart (one Django's guest carts never
 * match, so the guest gets a new cart). A session left with nothing is
 * cleared; otherwise it keeps the cart's cookie lifetime.
 */
export async function dropSignedInIdentity(
  event: RequestEvent,
  updates: Partial<Pick<UserSession, 'viewedPosts'>> = {},
): Promise<void> {
  const { cartId: _cartId, ...kept } = withoutIdentity(await getUserSession(event))
  const rest = { ...kept, ...updates }
  if (Object.values(rest).every(value => value === undefined)) {
    await clearUserSession(event)
    return
  }
  await replaceUserSession(event, rest, CART_SESSION_CONFIG)
}

export const useCartSession = (event: RequestEvent) => {
  return {
    getSession: () => getCartSession(event),
    updateSession: (updates: Partial<CartSessionData>) => updateCartSession(event, updates),
    getCartHeaders: (cartIdOverride?: string) => getCartHeaders(event, cartIdOverride),
    handleCartResponse: (response: unknown) => handleCartResponse(event, response),
    clearSession: () => clearCartSession(event),
  }
}
