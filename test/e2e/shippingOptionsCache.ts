import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { boxNowLockerOption } from '../fixtures/shippingOptions'
import { requestWithHost, sendJson } from '../helpers/e2e'

/**
 * Is a shipping options answer for one visitor's cart kept to them?
 *
 * Django flags the options a cart does not fit (`exceedsParcelSize`), so
 * `/api/shipping/options` names the visitor's cart, and a request that
 * names one skips Nitro's cache (`server/api/shipping/options.get.ts`).
 * Only a real server shows it: the unit harness neither caches nor
 * bypasses, and Nitro hands a cached handler only the headers its
 * `varies` names, which decides whether the cart cookie reaches it.
 *
 * Each test asks for its own weight, so its cache entry is its own.
 * Registered by test/e2e/storefront.spec.ts; the harness is
 * test/helpers/e2e.ts.
 */

const HOST = 'shipping-options.localhost'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'
const JSON_HEADERS = { Accept: 'application/json' }
const WITH_CART = { ...JSON_HEADERS, Cookie: `cart-id=${CART_UUID}` }

/** The `X-Cart-Id` of every options request Django received, per weight. */
const received = new Map<string, Array<string | undefined>>()

/** HOST's options: the BoxNow locker, flagged too large whenever a cart is named. */
export function shippingOptionsUpstream(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  if (req.headers['x-forwarded-host'] !== HOST) return false
  if (!url.pathname.endsWith('/shipping/options')) return false
  const cartId = req.headers['x-cart-id'] as string | undefined
  const weight = url.searchParams.get('weightGrams') ?? ''
  received.set(weight, [...(received.get(weight) ?? []), cartId])
  sendJson(res, [boxNowLockerOption({ exceedsParcelSize: cartId !== undefined })])
  return true
}

const options = (weightGrams: number, headers: Record<string, string>) =>
  requestWithHost(`/api/shipping/options?countryCode=GR&weightGrams=${weightGrams}`, HOST, headers)

const tooLarge = (body: string): boolean => JSON.parse(body)[0].exceedsParcelSize

export function describeShippingOptionsCache(): void {
  describe('the shipping options cache', () => {
    it('answers a visitor without a cart from the cache', async () => {
      const filling = await options(101, JSON_HEADERS)
      const replayed = await options(101, JSON_HEADERS)

      expect(filling.statusCode, filling.body.slice(0, 400)).toBe(200)
      expect(replayed.statusCode).toBe(200)
      expect(received.get('101')).toEqual([undefined])
      expect(replayed.headers.etag).toBe(filling.headers.etag)
      expect(tooLarge(replayed.body)).toBe(false)
    })

    it('asks Django every time for a visitor with a cart, naming the cart', async () => {
      const first = await options(102, WITH_CART)
      const second = await options(102, WITH_CART)

      expect(first.statusCode, first.body.slice(0, 400)).toBe(200)
      expect(second.statusCode).toBe(200)
      expect(received.get('102')).toEqual([CART_UUID, CART_UUID])
      expect(tooLarge(first.body)).toBe(true)
      expect(tooLarge(second.body)).toBe(true)
    })

    it('never stores a cart\'s answer for the visitors without one', async () => {
      await options(103, WITH_CART)
      const cartless = await options(103, JSON_HEADERS)
      const replayed = await options(103, JSON_HEADERS)

      expect(received.get('103')).toEqual([CART_UUID, undefined])
      expect(tooLarge(cartless.body)).toBe(false)
      expect(tooLarge(replayed.body)).toBe(false)
    })
  })
}
