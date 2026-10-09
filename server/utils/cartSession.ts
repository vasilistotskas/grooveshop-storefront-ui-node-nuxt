import { deleteCookie, getCookie, getRequestProtocol, setCookie } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

interface CartSessionData {
  // Cart UUID — the public identifier on the X-Cart-Id header. Switched
  // from the sequential integer PK so the namespace is non-enumerable
  // (M18 in MULTI_TENANT_AUDIT.md).
  cartId?: string
}

// Fallback cookie stores the bare cart UUID so we can recover if the
// encrypted ``nuxt-session`` cookie is cleared/rotated mid-browse. The
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

// The cart lives in nuxt-auth-utils' `nuxt-session`, beside the signed-in
// user: one sealed cookie, one password (`runtimeConfig.session`). A cart
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

export async function getCartSession(event: RequestEvent): Promise<CartSessionData> {
  const { cartId } = await getUserSession(event)
  if (cartId) return { cartId }
  const fallbackId = readFallbackCartId(event)
  if (fallbackId) {
    // Reconciliation: re-attach the fallback id to the session so subsequent
    // requests read the primary cookie and the fallback stays a pure spare.
    await setUserSession(event, { cartId: fallbackId }, CART_SESSION_CONFIG)
    return { cartId: fallbackId }
  }
  return {}
}

export async function updateCartSession(event: RequestEvent, updates: Partial<CartSessionData>): Promise<void> {
  if ('cartId' in updates && updates.cartId === undefined) {
    // `setUserSession` merges with defu, which skips an undefined value
    // and so keeps the old id; the session is rewritten without it. It
    // must stay otherwise intact: `nuxt-session` also holds the
    // signed-in user.
    const current = await getUserSession(event)
    await replaceUserSession(event, { ...current, cartId: undefined }, CART_SESSION_CONFIG)
    writeFallbackCartId(event, undefined)
    return
  }

  await setUserSession(event, updates, CART_SESSION_CONFIG)

  if ('cartId' in updates && isValidCartUuid(updates.cartId)) {
    writeFallbackCartId(event, updates.cartId)
  }
}

export async function getCartHeaders(event: RequestEvent, cartIdOverride?: string): Promise<Record<string, string>> {
  const { cartId } = await getCartSession(event)
  // Callers that need to address a cart other than the current session's
  // (e.g. the /cart/claim handoff, which must probe an agent-issued UUID
  // before ever writing it to the session) pass an explicit override.
  const effectiveCartId = cartIdOverride ?? cartId
  const accessToken = await getAllAuthAccessToken(event)
  const headers: Record<string, string> = {
    'X-Forwarded-Proto': getRequestProtocol(event, { xForwardedProto: true }),
    // Tenant resolution — prefer the actual request host so cart
    // operations hit the caller's tenant schema. Falls back to the
    // configured Django hostname outside request context.
    'X-Forwarded-Host': requestTenantHost(event),
    'X-Language': requestLocale(event),
  }

  if (effectiveCartId) {
    headers['X-Cart-Id'] = String(effectiveCartId)
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
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

export const useCartSession = (event: RequestEvent) => {
  return {
    getSession: () => getCartSession(event),
    updateSession: (updates: Partial<CartSessionData>) => updateCartSession(event, updates),
    getCartHeaders: (cartIdOverride?: string) => getCartHeaders(event, cartIdOverride),
    handleCartResponse: (response: unknown) => handleCartResponse(event, response),
    clearSession: () => clearCartSession(event),
  }
}
