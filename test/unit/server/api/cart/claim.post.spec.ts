/**
 * POST /api/cart/claim: the chat widget adopts the cart the shopping
 * assistant created for a browser that had none. Same adoption as
 * `/cart/claim` (`claimCart`), answered as JSON for the widget, and the
 * session changes only once the backend answered with a cart.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/claim.post'
import { useCartSession } from '~~/server/utils/cartSession'
import { makeCart } from '~~/test/fixtures/cart'
import { backend, callRoute, createRequestEvent, jsonResponse } from '~~/test/helpers/nitro'
import type { RouteResponse } from '~~/test/helpers/nitro'

const route = '/api/cart/claim'
const CLAIMED = '11111111-1111-4111-8111-111111111111'
const EXISTING = '33333333-3333-4333-8333-333333333333'

const claim = (body: unknown, cookie?: string) => callRoute(handler, {
  route,
  url: route,
  method: 'POST',
  body,
  headers: cookie ? { cookie } : {},
})

/** The cart id a follow-up request carrying the response's cookies would see. */
async function sessionCartId(response: RouteResponse, cookie = ''): Promise<string | undefined> {
  const jar = new Map(cookie.split('; ').filter(Boolean).map(pair => pair.split('=') as [string, string]))
  for (const set of response.headers.getSetCookie()) {
    const [pair = ''] = set.split(';')
    const index = pair.indexOf('=')
    jar.set(pair.slice(0, index), pair.slice(index + 1))
  }
  const next = createRequestEvent({ headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') } })
  return (await useCartSession(next).getSession()).cartId
}

describe('POST /api/cart/claim', () => {
  it('adopts the assistant\'s cart into the session and answers with it', async () => {
    backend.reply(makeCart({ uuid: CLAIMED }))

    const response = await claim({ uuid: CLAIMED })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ uuid: CLAIMED })
    expect(backend.lastRequest.headers.get('x-cart-id')).toBe(CLAIMED)
    expect(await sessionCartId(response)).toBe(CLAIMED)
  })

  it('refuses a malformed uuid without calling the backend', async () => {
    const response = await claim({ uuid: 'not-a-uuid' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('keeps the existing cart when the backend does not know the claimed one', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))
    const cookie = `cart-id=${EXISTING}`

    const response = await claim({ uuid: CLAIMED }, cookie)

    expect(response.status).toBe(404)
    expect(await sessionCartId(response, cookie)).toBe(EXISTING)
  })
})
