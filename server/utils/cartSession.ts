import type { H3Event } from 'h3'
// Import h3 cookie helpers explicitly: Nitro injects them as auto-imports at
// runtime, but vitest's `unit` project (node env) doesn't, so tests fail
// without the explicit import.
import { deleteCookie, getCookie, setCookie } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'

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

async function getSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  return await useSession<CartSessionData>(event, {
    name: 'nuxt-session',
    password: config.session.password,
    cookie: {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      maxAge: CART_ID_MAX_AGE,
    },
  })
}

function readFallbackCartId(event: H3Event): string | undefined {
  const raw = getCookie(event, CART_ID_FALLBACK_COOKIE)
  return isValidCartUuid(raw) ? raw : undefined
}

function writeFallbackCartId(event: H3Event, cartId: string | undefined): void {
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

export async function getCartSession(event: H3Event): Promise<CartSessionData> {
  const session = await getSession(event)
  if (session.data.cartId) return session.data
  const fallbackId = readFallbackCartId(event)
  if (fallbackId) {
    // Reconciliation: re-attach the fallback id to the session so subsequent
    // requests read the primary cookie and the fallback stays a pure spare.
    await session.update({ ...session.data, cartId: fallbackId })
    return { ...session.data, cartId: fallbackId }
  }
  return session.data
}

export async function updateCartSession(event: H3Event, updates: Partial<CartSessionData>): Promise<void> {
  const session = await getSession(event)

  if ('cartId' in updates && updates.cartId === undefined) {
    const { cartId: _cartId, ...rest } = session.data
    await session.update(rest)
    writeFallbackCartId(event, undefined)
    return
  }

  await session.update({
    ...session.data,
    ...updates,
  })

  if ('cartId' in updates && isValidCartUuid(updates.cartId)) {
    writeFallbackCartId(event, updates.cartId)
  }
}

export async function getCartHeaders(event: H3Event): Promise<Record<string, string>> {
  const { cartId } = await getCartSession(event)
  const accessToken = await getAllAuthAccessToken(event)
  const config = useRuntimeConfig(event)
  const locale = (event?.context?.locale as string | undefined) || DEFAULT_LOCALE
  const headers: Record<string, string> = {
    'X-Forwarded-Proto': getRequestProtocol(event, { xForwardedProto: true }),
    // Tenant resolution — prefer the actual request host so cart
    // operations hit the caller's tenant schema. Falls back to the
    // configured Django hostname outside request context.
    'X-Forwarded-Host': getRequestHost(event, { xForwardedHost: false }) || config.public.djangoHostName,
    'X-Language': locale,
  }

  if (cartId) {
    headers['X-Cart-Id'] = cartId
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

export async function handleCartResponse(event: H3Event, response: unknown): Promise<void> {
  if (
    response
    && typeof response === 'object'
    && 'uuid' in response
    && isValidCartUuid(response.uuid)
  ) {
    await updateCartSession(event, { cartId: response.uuid })
  }
}

export async function clearCartSession(event: H3Event): Promise<void> {
  await updateCartSession(event, { cartId: undefined })
}

export const useCartSession = (event: H3Event) => {
  return {
    getSession: () => getCartSession(event),
    updateSession: (updates: Partial<CartSessionData>) => updateCartSession(event, updates),
    getCartHeaders: () => getCartHeaders(event),
    handleCartResponse: (response: unknown) => handleCartResponse(event, response),
    clearSession: () => clearCartSession(event),
  }
}
