import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { resolve } from 'node:path'
import YAML from 'yaml'
import type { OrderDetail } from '~~/shared/openapi/types.gen'
import CheckoutSuccess from '~/components/Storefront/CheckoutSuccess.vue'
import WebsideCheckoutSuccess from '~/components/variants/webside/Storefront/CheckoutSuccess.vue'
import { useCartStore } from '~/stores/cart'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { makeOrder } from '~~/test/fixtures/order'
import { fixtureUuid } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'

/**
 * The order-confirmation page. Arriving from a payment provider it
 * polls the order until the provider's webhook lands — 5 tries for
 * Stripe, 15 for Viva (whose webhooks are slow), 2s apart — and stops
 * early on a paid or terminal status. An offline order (`?placed=1`,
 * COD) is final on arrival and never polls. The local cart is cleared
 * once per order, whatever the URL is reopened with.
 *
 * Both trees run the same script (the webside copy differs only in its
 * chrome), so the suite runs over both.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const { route } = vi.hoisted(() => ({
  route: { params: { uuid: '' } as Record<string, string>, query: {} as Record<string, string> },
}))
mockNuxtImport('useRoute', () => () => ({
  ...route,
  path: `/checkout/success/${route.params.uuid}`,
  fullPath: `/checkout/success/${route.params.uuid}`,
  name: 'checkout-success-uuid___el',
  hash: '',
  matched: [],
  meta: {},
}))

// The purchase pixels are not what this suite is about; stubbed so a
// mount never loads a vendor script.
const { pixel } = vi.hoisted(() => ({
  pixel: () => ({ trackPurchase: vi.fn(), trackCompletePayment: vi.fn(), trackOrderCreated: vi.fn() }),
}))
mockNuxtImport('useMetaPixel', () => pixel)
mockNuxtImport('useTikTokPixel', () => pixel)
mockNuxtImport('useOpenAIPixel', () => pixel)
mockNuxtImport('useGA4', () => pixel)
mockNuxtImport('useGoogleAds', () => pixel)

const UUID = fixtureUuid(7, 1)
const ORDER_URL = `/api/orders/uuid/${UUID}`
const POLL_INTERVAL = 2000

/** A Stripe order of 42€ (39€ of items + 3€ shipping), not yet paid. */
function order(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return makeOrder({
    id: 1001,
    uuid: UUID,
    paidAmount: 42,
    shippingPrice: 3,
    totalPriceItems: 39,
    totalPriceExtra: 3,
    payWayKey: 'STRIPE',
    isCollectedOnDelivery: false,
    ...overrides,
  })
}

/**
 * Serve the order: the first answer is what the page loads with, each
 * later one what a refresh sees (the last repeats).
 */
function serveOrders(...answers: Array<OrderDetail | (() => never)>) {
  let served = 0
  api.routes({
    [ORDER_URL]: () => {
      const next = answers[Math.min(served, answers.length - 1)]!
      served++
      return typeof next === 'function' ? next() : next
    },
  })
}

const refreshes = () => api.callsTo(ORDER_URL).length - 1

describe.each([
  ['default', CheckoutSuccess, 'app/components/Storefront/CheckoutSuccess.vue'],
  ['webside', WebsideCheckoutSuccess, 'app/components/variants/webside/Storefront/CheckoutSuccess.vue'],
])('CheckoutSuccess (%s tree)', (_tree, Component, file) => {
  const block = parseSfc(resolve(REPO, file)).customBlocks.find(b => b.type === 'i18n')!
  const messages = YAML.parse(block.content).el

  // Every mount is unmounted after its test (enableAutoUnmount in
  // test/fixtures/setup/nuxt.ts), so no page keeps polling into the next.
  const mount = () => mountSuspended(Component, { route: false })

  /**
   * The error the page's setup throws. Captured by a parent, as Nuxt's
   * error handling would; only the FIRST one counts — Vue still renders
   * the component whose setup threw, which fails on its missing
   * bindings right after.
   */
  async function setupError(): Promise<unknown> {
    let captured: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((error) => {
          captured ??= error
          return false
        })
        return () => h(Component)
      },
    })
    await mountSuspended(Parent, { route: false })
    await flushPromises()
    return captured
  }

  beforeEach(() => {
    clearNuxtData()
    localStorage.clear()
    route.params = { uuid: UUID }
    route.query = {}
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('payment verification', () => {
    it('stops polling a Stripe order after 5 attempts and says the payment is processing', async () => {
      route.query = { session_id: 'cs_test_1' }
      serveOrders(order())
      const wrapper = await mount()

      expect(wrapper.text()).toContain(messages.verifying.payment)
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(5)
      expect(wrapper.text()).not.toContain(messages.verifying.payment)
      expect(wrapper.text()).toContain(messages.payment.processing.title)
    })

    it('gives a Viva order 15 attempts', async () => {
      route.query = { s: '7310000000000' }
      serveOrders(order({ payWayKey: 'VIVA_WALLET' }))
      await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 14)
      expect(refreshes()).toBe(14)
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 5)
      expect(refreshes()).toBe(15)
    })

    it('waits the interval before each attempt', async () => {
      route.query = { session_id: 'cs_test_1' }
      serveOrders(order())
      await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL - 1)
      expect(refreshes()).toBe(0)
      await vi.advanceTimersByTimeAsync(1)
      expect(refreshes()).toBe(1)
    })

    it('stops as soon as the webhook marks the order paid', async () => {
      route.query = { session_id: 'cs_test_1' }
      serveOrders(order(), order(), order({ isPaid: true, paymentStatus: 'COMPLETED' }))
      const wrapper = await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(2)
      expect(wrapper.text()).toContain(messages.payment.completed.title)
    })

    it.each([['FAILED'], ['CANCELED'], ['REFUNDED'], ['COMPLETED']])(
      'stops on the terminal status %s even while unpaid',
      async (paymentStatus) => {
        route.query = { session_id: 'cs_test_1' }
        serveOrders(order(), order({ paymentStatus: paymentStatus as OrderDetail['paymentStatus'] }))
        await mount()

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

        expect(refreshes()).toBe(1)
      },
    )

    it('stops polling once the page is left', async () => {
      route.query = { session_id: 'cs_test_1' }
      serveOrders(order())
      const wrapper = await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL)
      expect(refreshes()).toBe(1)
      wrapper.unmount()
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(1)
    })

    it('keeps polling through a failed refetch and still ends the verification', async () => {
      route.query = { session_id: 'cs_test_1' }
      serveOrders(order(), failWith(502))
      const wrapper = await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(5)
      expect(wrapper.text()).not.toContain(messages.verifying.payment)
    })

    it('treats an order already paid on arrival as verified, without polling', async () => {
      route.query = { session_id: 'cs_test_1' }
      serveOrders(order({ isPaid: true, paymentStatus: 'COMPLETED' }))
      const wrapper = await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(0)
      expect(wrapper.text()).toContain(messages.payment.completed.title)
    })

    it('never polls a cash-on-delivery order and tells the shopper they pay on delivery', async () => {
      route.query = { placed: '1' }
      serveOrders(order({ payWayKey: 'PAY_ON_DELIVERY', isCollectedOnDelivery: true }))
      const wrapper = await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(0)
      expect(wrapper.text()).toContain(messages.payment.on_delivery.title)
      expect(wrapper.text()).not.toContain(messages.verifying.payment)
    })

    it('neither polls nor claims a payment state on a direct revisit', async () => {
      serveOrders(order())
      const wrapper = await mount()

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 10)

      expect(refreshes()).toBe(0)
      expect(wrapper.text()).not.toContain(messages.payment.processing.title)
      expect(wrapper.text()).not.toContain(messages.payment.completed.title)
    })
  })

  describe('cart cleanup', () => {
    it('clears the local cart once per order, not on every reopening of the URL', async () => {
      const cleanCartState = vi.spyOn(useCartStore(), 'cleanCartState').mockResolvedValue(undefined)
      route.query = { placed: '1' }
      serveOrders(order({ isCollectedOnDelivery: true }))

      await mount()
      await flushPromises()
      expect(cleanCartState).toHaveBeenCalledTimes(1)

      clearNuxtData()
      await mount()
      await flushPromises()
      expect(cleanCartState).toHaveBeenCalledTimes(1)
    })

    it('leaves the cart alone on a direct revisit', async () => {
      const cleanCartState = vi.spyOn(useCartStore(), 'cleanCartState').mockResolvedValue(undefined)
      serveOrders(order())

      await mount()
      await flushPromises()

      expect(cleanCartState).not.toHaveBeenCalled()
    })
  })

  describe('missing order', () => {
    it('404s when the order does not exist', async () => {
      serveOrders(failWith(404))

      expect(await setupError()).toMatchObject({ statusCode: 404 })
    })

    it('404s without a uuid in the route', async () => {
      route.params = {}

      expect(await setupError()).toMatchObject({ statusCode: 404 })
      expect(api.callsTo('/api/orders/uuid/*')).toEqual([])
    })
  })
})
