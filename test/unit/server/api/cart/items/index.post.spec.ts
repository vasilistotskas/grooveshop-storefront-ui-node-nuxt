/**
 * POST /api/cart/items: the add-to-cart proxy. It forwards what Django's
 * `CartItemCreateRequest` accepts, including the write-only `attribution`
 * (the tab's first-touch order source), and refuses an attribution that
 * would fail Django's own validation before calling it.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/items/index.post'
import { makeCartItem } from '~~/test/fixtures/cart'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/cart/items'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

/** What Django answers an add with: the line, as `CartItemDetail`. */
const createdLine = () => ({
  ...makeCartItem(),
  cartId: CART_UUID,
  recommendations: [],
})

const add = (body: unknown) => callRoute(handler, { route, url: route, method: 'POST', body })

describe('POST /api/cart/items', () => {
  it('forwards the captured attribution to Django with the line', async () => {
    backend.reply(createdLine())
    const attribution = { utmSource: 'newsletter', clickIds: ['gclid'], landingPath: '/p/4' }

    const response = await add({ product: 4, quantity: 2, attribution })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart/item')
    expect(backend.lastRequest.body).toEqual({ product: 4, quantity: 2, attribution })
  })

  it('forwards a line without attribution as it is', async () => {
    backend.reply(createdLine())

    await add({ product: 4, quantity: 2 })

    expect(backend.lastRequest.body).toEqual({ product: 4, quantity: 2 })
  })

  it('refuses a click id Django does not know, without calling it', async () => {
    const response = await add({ product: 4, attribution: { clickIds: ['not-a-click-id'] } })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
