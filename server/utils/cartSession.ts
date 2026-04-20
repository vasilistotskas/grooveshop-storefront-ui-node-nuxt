import type { H3Event } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'

interface CartSessionData {
  cartId?: number
}

// Fallback cookie stores the bare cart id as a string so we can recover if
// the encrypted ``nuxt-session`` cookie is cleared/rotated mid-browse. The
// value is non-sensitive — it's just a lookup key the backend already
// validates against the X-Cart-Id permission path.
const CART_ID_FALLBACK_COOKIE = 'cart-id'
const CART_ID_MAX_AGE = 60 * 60 * 24 * 30

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

function readFallbackCartId(event: H3Event): number | undefined {
  const raw = getCookie(event, CART_ID_FALLBACK_COOKIE)
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function writeFallbackCartId(event: H3Event, cartId: number | undefined): void {
  if (cartId === undefined) {
    deleteCookie(event, CART_ID_FALLBACK_COOKIE, { path: '/' })
    return
  }
  setCookie(event, CART_ID_FALLBACK_COOKIE, String(cartId), {
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
    const { cartId, ...rest } = session.data
    await session.update(rest)
    writeFallbackCartId(event, undefined)
    return
  }

  await session.update({
    ...session.data,
    ...updates,
  })

  if ('cartId' in updates && typeof updates.cartId === 'number') {
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
    'X-Forwarded-Host': config.public.djangoHostName || getRequestHost(event, { xForwardedHost: false }),
    'X-Language': locale,
  }

  if (cartId) {
    headers['X-Cart-Id'] = String(cartId)
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

export async function handleCartResponse(event: H3Event, response: any): Promise<void> {
  if (response.id) {
    await updateCartSession(event, { cartId: response.id })
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
    handleCartResponse: (response: any) => handleCartResponse(event, response),
    clearSession: () => clearCartSession(event),
  }
}
