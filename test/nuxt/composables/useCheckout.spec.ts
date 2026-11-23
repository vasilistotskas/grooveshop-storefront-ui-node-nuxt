import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

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
        '/api/cart/reserve-stock': failWith(409, { code: 'insufficient_stock', failedItems, detail: 'No stock' }),
      })

      await expect(useCheckout().reserveStock(1)).rejects.toMatchObject({
        code: 'insufficient_stock',
        failedItems,
        detail: 'No stock',
      })
    })

    it('rethrows any other failure unchanged', async () => {
      const outage = Object.assign(new Error('503'), { statusCode: 503 })
      api.routes({
        '/api/cart/reserve-stock': () => {
          throw outage
        },
      })

      await expect(useCheckout().reserveStock(1)).rejects.toBe(outage)
    })
  })

  it('releases the given reservations and rethrows a failure', async () => {
    await useCheckout().releaseReservations([4, 5])
    expect(api.callsTo('/api/cart/release-reservations')).toEqual([
      { url: '/api/cart/release-reservations', options: { method: 'POST', body: { reservationIds: [4, 5] } } },
    ])

    const failure = new Error('500')
    api.routes({
      '/api/cart/release-reservations': () => {
        throw failure
      },
    })
    await expect(useCheckout().releaseReservations([4])).rejects.toBe(failure)
  })
})
