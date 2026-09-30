import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const PAYMENT_INTENT_ARGS: CartCreatePaymentIntentRequestRequest = { payWayId: 2, shippingKind: 'home_delivery', countryId: 'GR' }

describe('useCheckout', () => {
  describe('reserveStock', () => {
    it('reserves the cart and returns the reservation ids', async () => {
      api.routes({ '/api/cart/reserve-stock': { reservationIds: [4, 5] } })

      await expect(useCheckout().reserveStock('cart-uuid')).resolves.toEqual([4, 5])
      expect(api.callsTo('/api/cart/reserve-stock')).toEqual([
        { url: '/api/cart/reserve-stock', options: { method: 'POST', body: { cartId: 'cart-uuid' } } },
      ])
    })

    it('returns no ids when the response carries none', async () => {
      await expect(useCheckout().reserveStock(1)).resolves.toEqual([])
    })

    it('rethrows a 409 shortfall as an error naming the failed lines', async () => {
      const failedItems = [{ productId: 1, productName: 'Shirt', available: 0, requested: 1 }]
      api.routes({
        '/api/cart/reserve-stock': () => {
          throw Object.assign(new Error('409'), { data: { data: { code: 'insufficient_stock', failedItems, detail: 'No stock' } } })
        },
      })

      await expect(useCheckout().reserveStock(1)).rejects.toMatchObject({
        code: 'insufficient_stock',
        failedItems,
        detail: 'No stock',
      })
    })

    it('rethrows any other failure unchanged', async () => {
      const outage = Object.assign(new Error('503'), { statusCode: 503 })
      api.routes({ '/api/cart/reserve-stock': () => { throw outage } })

      await expect(useCheckout().reserveStock(1)).rejects.toBe(outage)
    })
  })

  describe('createPaymentIntentFromCart', () => {
    it('sends the idempotency key as a header and returns the intent', async () => {
      api.routes({
        '/api/cart/create-payment-intent': { clientSecret: 'cs_1', paymentIntentId: 'pi_1', amount: 1000, currency: 'EUR' },
      })

      await expect(useCheckout().createPaymentIntentFromCart(PAYMENT_INTENT_ARGS, 'idem-1'))
        .resolves.toEqual({ clientSecret: 'cs_1', paymentIntentId: 'pi_1' })
      expect(api.callsTo('/api/cart/create-payment-intent')[0]!.options).toEqual({
        method: 'POST',
        body: PAYMENT_INTENT_ARGS,
        headers: { 'Idempotency-Key': 'idem-1' },
      })
    })

    it('sends no headers without a key', async () => {
      api.routes({ '/api/cart/create-payment-intent': { clientSecret: 'cs', paymentIntentId: 'pi' } })

      await useCheckout().createPaymentIntentFromCart(PAYMENT_INTENT_ARGS)

      expect(api.callsTo('/api/cart/create-payment-intent')[0]!.options.headers).toBeUndefined()
    })
  })

  it('releases the given reservations and rethrows a failure', async () => {
    await useCheckout().releaseReservations([4, 5])
    expect(api.callsTo('/api/cart/release-reservations')).toEqual([
      { url: '/api/cart/release-reservations', options: { method: 'POST', body: { reservationIds: [4, 5] } } },
    ])

    const failure = new Error('500')
    api.routes({ '/api/cart/release-reservations': () => { throw failure } })
    await expect(useCheckout().releaseReservations([4])).rejects.toBe(failure)
  })
})
