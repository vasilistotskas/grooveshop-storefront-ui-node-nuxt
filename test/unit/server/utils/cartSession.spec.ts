import type { RequestEvent } from 'nuxt/server'
import { describe, expect, it } from 'vitest'
import {
  clearCartSession,
  getCartHeaders,
  getCartSession,
  handleCartResponse,
  updateCartSession,
  useCartSession,
} from '~~/server/utils/cartSession'
import { createRequestEvent, testSession } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

/**
 * The cart id lives in nuxt-auth-utils' session (`nuxt-session`, the
 * signed-in user's cookie too; `testSession` here) plus a plain
 * `cart-id` spare cookie. A "next request" is a new event carrying the
 * spare cookie the previous response set, as a browser would send it.
 */
const CART_A = '11111111-1111-4111-8111-111111111111'
const CART_B = '22222222-2222-4222-8222-222222222222'
const THIRTY_DAYS = 60 * 60 * 24 * 30

function spareCookie(event: RequestEvent): string | undefined {
  return event.res.headers.getSetCookie().filter(cookie => cookie.startsWith('cart-id=')).at(-1)
}

/** The next request of a browser that received `previous`'s spare cookie. */
function nextRequest(previous: RequestEvent, req: TestRequest = {}): RequestEvent {
  const pair = spareCookie(previous)?.split(';')[0]
  const cookie = pair && pair !== 'cart-id=' ? pair : ''
  return createRequestEvent({ ...req, headers: { ...(cookie ? { cookie } : {}), ...req.headers } })
}

/** A visitor whose session already holds `cartId`. */
async function visitorWithCart(cartId: string, req: TestRequest = {}): Promise<RequestEvent> {
  const first = createRequestEvent()
  await updateCartSession(first, { cartId })
  return nextRequest(first, req)
}

describe('cart session', () => {
  it('has no cart for a new visitor', async () => {
    await expect(getCartSession(createRequestEvent())).resolves.not.toHaveProperty('cartId')
  })

  it('keeps the cart id in the session, sealed with the cart\'s own 30-day cookie', async () => {
    await updateCartSession(createRequestEvent(), { cartId: CART_A })

    expect(testSession.data.cartId).toBe(CART_A)
    expect(testSession.writeConfig).toEqual({
      cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: THIRTY_DAYS },
    })
    expect((await getCartSession(createRequestEvent())).cartId).toBe(CART_A)
  })

  it('writes the plain cart-id spare cookie alongside it, readable by the page for 30 days', async () => {
    const event = createRequestEvent()

    await updateCartSession(event, { cartId: CART_A })

    const spare = spareCookie(event)!
    expect(spare.split(';')[0]).toBe(`cart-id=${CART_A}`)
    expect(spare).toMatch(/Max-Age=2592000(;|$)/)
    expect(spare).toMatch(/Path=\//)
    expect(spare).toMatch(/SameSite=Lax/)
    expect(spare).not.toMatch(/HttpOnly/)
  })

  it('recovers the cart from the spare cookie when the session is lost, and re-attaches it', async () => {
    const first = createRequestEvent()
    await updateCartSession(first, { cartId: CART_A })
    testSession.set({})

    expect((await getCartSession(nextRequest(first))).cartId).toBe(CART_A)

    // The session carries it again, so the spare is no longer needed.
    expect(testSession.data.cartId).toBe(CART_A)
  })

  it('ignores a spare cookie that is not a UUID', async () => {
    const event = createRequestEvent({ headers: { cookie: 'cart-id=1%20OR%201=1' } })

    await expect(getCartSession(event)).resolves.not.toHaveProperty('cartId')
  })

  it('clearing the cart removes it from the session and the spare, so the next request has none', async () => {
    const withCart = await visitorWithCart(CART_A)

    await clearCartSession(withCart)

    expect(spareCookie(withCart)).toMatch(/^cart-id=;.*Max-Age=0/)
    await expect(getCartSession(nextRequest(withCart))).resolves.not.toHaveProperty('cartId')
  })

  it('clearing the cart keeps the rest of the shared session, so the shopper stays signed in', async () => {
    // `nuxt-session` is nuxt-auth-utils' cookie as well: clearing the
    // whole session instead of the one key would sign the shopper out.
    testSession.set({ user: { id: 7 } })
    const withCart = await visitorWithCart(CART_A)

    await clearCartSession(withCart)

    expect(testSession.data).toEqual({ user: { id: 7 } })
  })

  describe('handleCartResponse', () => {
    it('adopts the cart uuid the backend answered with', async () => {
      const withCart = await visitorWithCart(CART_A)

      await handleCartResponse(withCart, { uuid: CART_B, items: [] })

      expect((await getCartSession(nextRequest(withCart))).cartId).toBe(CART_B)
    })

    it.each([
      ['no uuid', { id: 1 }],
      ['a malformed uuid', { uuid: 'not-a-uuid' }],
      ['an empty uuid', { uuid: '' }],
      ['a non-object', 'ok'],
      ['null', null],
    ])('keeps the current cart for a response with %s', async (_label, response) => {
      const withCart = await visitorWithCart(CART_A)

      await handleCartResponse(withCart, response)

      expect((await getCartSession(nextRequest(withCart))).cartId).toBe(CART_A)
    })
  })

  describe('getCartHeaders', () => {
    it('addresses the tenant of the request, never a spoofed X-Forwarded-Host, in the page locale', async () => {
      const headers = await getCartHeaders(createRequestEvent({
        host: 'webside.gr',
        headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' },
        context: { locale: 'en' },
      }))

      expect(headers).toEqual({ 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'webside.gr', 'X-Language': 'en' })
    })

    it('sends the session cart and the signed-in user token', async () => {
      testSession.set({ secure: { accessToken: 'knox-1' } })
      const withCart = await visitorWithCart(CART_A)

      const headers = await getCartHeaders(withCart)

      expect(headers['X-Cart-Id']).toBe(CART_A)
      expect(headers['Authorization']).toBe('Bearer knox-1')
      expect(headers['X-Language']).toBe('el')
    })

    it('addresses an explicit cart instead of the session one when asked (the /cart/claim probe)', async () => {
      const withCart = await visitorWithCart(CART_A)

      expect((await getCartHeaders(withCart, CART_B))['X-Cart-Id']).toBe(CART_B)
      // The probe does not write the override into the session.
      expect((await getCartSession(nextRequest(withCart))).cartId).toBe(CART_A)
    })
  })

  it('useCartSession binds the same operations to one event', async () => {
    const event = createRequestEvent()
    const cart = useCartSession(event)

    await cart.handleCartResponse({ uuid: CART_A })
    expect((await cart.getSession()).cartId).toBe(CART_A)
    expect((await cart.getCartHeaders())['X-Cart-Id']).toBe(CART_A)

    await cart.clearSession()
    expect(spareCookie(event)).toMatch(/Max-Age=0/)
  })
})
