/**
 * Agent-built carts hand the shopper `/cart/claim?uuid=<cart-uuid>`.
 * The route adopts that guest cart into the browser session and sends
 * the shopper to /cart. Any failure redirects to /cart WITHOUT touching
 * the session, so a bad or replayed link never clobbers a real cart.
 *
 * The session is h3's real sealed cookie; `sessionCartId` reads back what
 * the response set, the way the shopper's next request would.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/cart/claim.get'
import { useCartSession } from '~~/server/utils/cartSession'
import { makeCart } from '~~/test/fixtures/cart'
import { backend, callRoute, createTestEvent, jsonResponse, loggerOf } from '~~/test/helpers/nitro'
import type { RouteResponse } from '~~/test/helpers/nitro'

const route = '/cart/claim'
const CLAIMED = '11111111-1111-4111-8111-111111111111'
const MERGED = '22222222-2222-4222-8222-222222222222'
const EXISTING = '33333333-3333-4333-8333-333333333333'

const claim = (query: string, cookie?: string) => callRoute(handler, {
  route,
  url: `${route}${query}`,
  headers: { 'x-forwarded-host': 'evil.example', ...(cookie ? { cookie } : {}) },
})

/** The cart id a follow-up request carrying the response's cookies would see. */
async function sessionCartId(response: RouteResponse, cookie = ''): Promise<string | undefined> {
  const jar = new Map(cookie.split('; ').filter(Boolean).map(pair => pair.split('=') as [string, string]))
  for (const set of response.headers.getSetCookie()) {
    const [pair = ''] = set.split(';')
    const index = pair.indexOf('=')
    jar.set(pair.slice(0, index), pair.slice(index + 1))
  }
  const next = createTestEvent({ headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') } })
  return (await useCartSession(next).getSession()).cartId
}

describe('GET /cart/claim', () => {
  it('probes the claimed cart on the store\'s backend, adopts it and redirects to /cart', async () => {
    backend.reply(makeCart({ uuid: CLAIMED }))

    const response = await claim(`?uuid=${CLAIMED}`)

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/cart')
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart')
    expect(backend.lastRequest.headers.get('x-cart-id')).toBe(CLAIMED)
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(await sessionCartId(response)).toBe(CLAIMED)
    expect(response.logger.fields).toMatchObject({ cart: { claimed: CLAIMED } })
  })

  it('adopts the cart the backend answered with when it differs (a merged cart)', async () => {
    backend.reply(makeCart({ uuid: MERGED }))

    const response = await claim(`?uuid=${CLAIMED}`)

    expect(await sessionCartId(response)).toBe(MERGED)
    expect(loggerOf(response.event).fields).toMatchObject({ cart: { claimed: MERGED } })
  })

  it.each([
    ['a malformed uuid', '?uuid=not-a-uuid'],
    ['no uuid', ''],
  ])('redirects to /cart without calling the backend or touching the session for %s', async (_label, query) => {
    const cookie = `cart-id=${EXISTING}`

    const response = await claim(query, cookie)

    expect(response.headers.get('location')).toBe('/cart')
    expect(backend.requests).toEqual([])
    expect(response.headers.getSetCookie()).toEqual([])
    expect(await sessionCartId(response, cookie)).toBe(EXISTING)
  })

  it('keeps the existing cart when the claimed one is unknown to the backend', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))
    const cookie = `cart-id=${EXISTING}`

    const response = await claim(`?uuid=${CLAIMED}`, cookie)

    expect(response.headers.get('location')).toBe('/cart')
    expect(await sessionCartId(response, cookie)).toBe(EXISTING)
  })

  it('keeps the existing cart when the backend answers with something that is not a cart', async () => {
    backend.reply({ uuid: CLAIMED })
    const cookie = `cart-id=${EXISTING}`

    const response = await claim(`?uuid=${CLAIMED}`, cookie)

    expect(response.headers.get('location')).toBe('/cart')
    expect(await sessionCartId(response, cookie)).toBe(EXISTING)
  })
})
