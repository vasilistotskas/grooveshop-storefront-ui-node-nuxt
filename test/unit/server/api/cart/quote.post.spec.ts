import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/quote.post'
import { makeCartQuote } from '~~/test/fixtures/checkoutQuote'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/cart/quote: what checkout charges for the session cart with
 * the shopper's choices so far. The cart is named as order creation
 * names it, so the quote is the price that order is created at.
 */

const route = '/api/cart/quote'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

const quoteBody = { payWayId: 1, shippingKind: 'home_delivery', countryId: 'GR', email: 'a@b.gr' }

function askQuote(body: unknown = quoteBody, headers: Record<string, string> = {}) {
  return callRoute(handler, {
    route,
    method: 'POST',
    body,
    headers: { cookie: `cart-id=${CART_UUID}`, ...headers },
  })
}

describe('POST /api/cart/quote', () => {
  it('quotes the session cart as the signed-in shopper, with the choices sent', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply(makeCartQuote())

    const response = await askQuote()

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ amountDue: 63, expectedTotal: { amount: 6300, currency: 'EUR' } })
    const sent = backend.lastRequest
    expect(sent.path).toBe('http://backend.test/api/v1/cart/quote')
    expect(sent.method).toBe('POST')
    expect(sent.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
    expect(sent.body).toEqual(quoteBody)
  })

  // Every choice is optional on Django's side, the body itself too.
  it('quotes the cart alone for a request without a body', async () => {
    backend.reply(makeCartQuote())

    const response = await callRoute(handler, { route, method: 'POST', headers: { cookie: `cart-id=${CART_UUID}` } })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart/quote')
  })

  it('never names the cart by a cart token the browser sent', async () => {
    backend.reply(makeCartQuote())

    await askQuote(quoteBody, { 'x-cart-token': 'agent-token' })

    expect(backend.lastRequest.headers.has('x-cart-token')).toBe(false)
  })

  it('refuses a body Django would not price without calling it', async () => {
    const response = await askQuote({ shippingKind: 'teleport' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('returns Django\'s refusal with its 4xx status', async () => {
    const refusal = { detail: 'Δεν γίνεται αποστολή.', reason: 'shipping_unavailable', code: 'shipping_unavailable' }
    backend.reply(jsonResponse(refusal, 400))

    const response = await askQuote()

    expect(response.status).toBe(400)
    expect(response.body).toEqual(refusal)
  })

  // An amount in cents that is not whole would be sent back as an
  // expected total no order can match.
  it('answers 422 for a quote that breaks the contract', async () => {
    backend.reply({ ...makeCartQuote(), expectedTotal: { amount: 63.5, currency: 'EUR' } })

    const response = await askQuote()

    expect(response.status).toBe(422)
  })
})
