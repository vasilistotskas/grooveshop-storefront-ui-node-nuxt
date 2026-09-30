import { parseCookies, useSession } from 'h3'
import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  clearCartSession,
  getCartHeaders,
  getCartSession,
  handleCartResponse,
  updateCartSession,
  useCartSession,
} from '~~/server/utils/cartSession'
import { createTestEvent, testSession } from '~~/test/helpers/nitro'
import { useRuntimeConfig } from '~~/test/helpers/nitro/runtime'
import type { TestRequest } from '~~/test/helpers/nitro'

/**
 * The cart id lives in h3's REAL sealed session cookie (`nuxt-session`,
 * sealed with the test session password) plus a plain `cart-id` spare.
 * A "next request" is a new event carrying the cookies the previous
 * response set, as a browser would send them.
 */
const CART_A = '11111111-1111-4111-8111-111111111111'
const CART_B = '22222222-2222-4222-8222-222222222222'

function setCookies(event: H3Event): string[] {
  const header = event.node.res.getHeader('set-cookie')
  return header === undefined ? [] : ([] as string[]).concat(header as string | string[])
}

function setCookie(event: H3Event, name: string): string | undefined {
  return setCookies(event).filter(cookie => cookie.startsWith(`${name}=`)).at(-1)
}

/** The `Cookie` header a browser sends after receiving `event`'s response: what it sent, updated by what it got. */
function cookieHeaderAfter(event: H3Event, keep: string[] = ['nuxt-session', 'cart-id']): string {
  const jar = new Map(Object.entries(parseCookies(event)).filter(([name]) => keep.includes(name)))
  for (const cookie of setCookies(event)) {
    const [pair] = cookie.split(';')
    const [name, value] = pair!.split('=')
    if (!keep.includes(name!)) continue
    if (/max-age=0/i.test(cookie) || value === '') jar.delete(name!)
    else jar.set(name!, value!)
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
}

function nextRequest(previous: H3Event, keep?: string[], req: TestRequest = {}): H3Event {
  return createTestEvent({ ...req, headers: { cookie: cookieHeaderAfter(previous, keep), ...req.headers } })
}

/** A visitor whose session already holds `cartId`. */
async function visitorWithCart(cartId: string, req: TestRequest = {}): Promise<H3Event> {
  const first = createTestEvent()
  await updateCartSession(first, { cartId })
  return nextRequest(first, undefined, req)
}

describe('cart session', () => {
  it('has no cart for a new visitor', async () => {
    await expect(getCartSession(createTestEvent())).resolves.not.toHaveProperty('cartId')
  })

  it('keeps the cart id in the sealed session across requests', async () => {
    const first = createTestEvent()
    await updateCartSession(first, { cartId: CART_A })

    expect(setCookie(first, 'nuxt-session')).not.toContain(CART_A)
    expect((await getCartSession(nextRequest(first, ['nuxt-session']))).cartId).toBe(CART_A)
  })

  it('writes the plain cart-id spare cookie alongside it, readable by the page for 30 days', async () => {
    const event = createTestEvent()

    await updateCartSession(event, { cartId: CART_A })

    const spare = setCookie(event, 'cart-id')!
    expect(spare.split(';')[0]).toBe(`cart-id=${CART_A}`)
    expect(spare).toMatch(/Max-Age=2592000(;|$)/)
    expect(spare).toMatch(/Path=\//)
    expect(spare).toMatch(/SameSite=Lax/)
    expect(spare).not.toMatch(/HttpOnly/)
  })

  it('recovers the cart from the spare cookie when the session cookie is lost, and re-attaches it', async () => {
    const first = createTestEvent()
    await updateCartSession(first, { cartId: CART_A })
    const withoutSession = nextRequest(first, ['cart-id'])

    expect((await getCartSession(withoutSession)).cartId).toBe(CART_A)

    // The session carries it again, so the spare is no longer needed.
    const sessionOnly = nextRequest(withoutSession, ['nuxt-session'])
    expect((await getCartSession(sessionOnly)).cartId).toBe(CART_A)
  })

  it('ignores a spare cookie that is not a UUID', async () => {
    const event = createTestEvent({ headers: { cookie: 'cart-id=1%20OR%201=1' } })

    await expect(getCartSession(event)).resolves.not.toHaveProperty('cartId')
  })

  it('clearing the cart removes it from the session and the spare, so the next request has none', async () => {
    const withCart = await visitorWithCart(CART_A)

    await clearCartSession(withCart)

    expect(setCookie(withCart, 'cart-id')).toMatch(/^cart-id=;.*Max-Age=0/)
    await expect(getCartSession(nextRequest(withCart))).resolves.not.toHaveProperty('cartId')
  })

  it('clearing the cart keeps the rest of the shared session, so the shopper stays signed in', async () => {
    // `nuxt-session` is nuxt-auth-utils' cookie as well: clearing the
    // whole session instead of the one key would sign the shopper out.
    const sessionConfig = { name: 'nuxt-session', password: useRuntimeConfig().session.password }
    const first = createTestEvent()
    await (await useSession(first, sessionConfig)).update({ user: { id: 7 } })
    await updateCartSession(first, { cartId: CART_A })
    const withCart = nextRequest(first)

    await clearCartSession(withCart)

    const after = await useSession(nextRequest(withCart), sessionConfig)
    expect(after.data).toEqual({ user: { id: 7 } })
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
      const headers = await getCartHeaders(createTestEvent({
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
    const event = createTestEvent()
    const cart = useCartSession(event)

    await cart.handleCartResponse({ uuid: CART_A })
    expect((await cart.getSession()).cartId).toBe(CART_A)
    expect((await cart.getCartHeaders())['X-Cart-Id']).toBe(CART_A)

    await cart.clearSession()
    expect(setCookie(event, 'cart-id')).toMatch(/Max-Age=0/)
  })
})
