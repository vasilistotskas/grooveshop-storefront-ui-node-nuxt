import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/create-payment-intent.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/cart/create-payment-intent: prices the Stripe intent for the
 * cart before the order is submitted. A retried checkout attempt carries
 * the same Idempotency-Key, which this route passes to Django so the
 * retry does not mint a second PaymentIntent.
 */

const route = '/api/cart/create-payment-intent'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'
const KEY = '3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c'

const intentBody = { payWayId: 1, shippingKind: 'home_delivery', countryId: 'GR' }
const intent = { clientSecret: 'cs_1', paymentIntentId: 'pi_1', amount: 1000, currency: 'EUR' }

function createIntent(headers: Record<string, string> = {}) {
  return callRoute(handler, {
    route,
    method: 'POST',
    body: intentBody,
    headers: { cookie: `cart-id=${CART_UUID}`, ...headers },
  })
}

describe('POST /api/cart/create-payment-intent', () => {
  it('prices the intent for the session cart as the signed-in shopper', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply(intent)

    const response = await createIntent()

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ clientSecret: 'cs_1', paymentIntentId: 'pi_1' })
    const sent = backend.lastRequest
    expect(sent.path).toBe('http://backend.test/api/v1/cart/create-payment-intent')
    expect(sent.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('forwards the attempt\'s Idempotency-Key to Django', async () => {
    backend.reply(intent)

    await createIntent({ 'idempotency-key': KEY })

    expect(backend.lastRequest.headers.get('idempotency-key')).toBe(KEY)
  })

  it('sends none when the browser sent none', async () => {
    backend.reply(intent)

    await createIntent()

    expect(backend.lastRequest.headers.has('idempotency-key')).toBe(false)
  })

  it.each(['not-a-uuid', '0000-idem-key'])('refuses the malformed key %j without calling Django', async (key) => {
    const response = await createIntent({ 'idempotency-key': key })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('returns Django\'s refusal with its 4xx status', async () => {
    backend.reply(jsonResponse({ reason: 'nothing_to_charge' }, 400))

    const response = await createIntent({ 'idempotency-key': KEY })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ reason: 'nothing_to_charge' })
  })
})
