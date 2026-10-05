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
import { makeOrder, makeOrderItem } from '~~/test/fixtures/order'
import { makeBoxNowLocker, makeBoxNowShipment } from '~~/test/fixtures/boxnow'
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
 * Both trees run the same verification script, so that suite runs over
 * both; the default tree's own layout (heading, what happens next, the
 * summary and the ways on) has its own suite below.
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

const { session } = vi.hoisted(() => ({ session: { loggedIn: false } }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(session.loggedIn),
  user: ref(session.loggedIn ? { id: 7 } : null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

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

    // A failed poll used to reset the page's order to its empty default
    // (Nuxt clears `data` on a failed refetch): every total, line and the
    // order number vanished from the confirmation mid-poll.
    it('keeps the order on screen through a failed poll, and takes the next answer', async () => {
      route.query = { session_id: 'cs_test_1' }
      const paid = order({ isPaid: true, paymentStatus: 'COMPLETED' })
      serveOrders(order(), failWith(502), paid)
      const wrapper = await mount()
      const email = order().email!

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL)
      expect(wrapper.text()).toContain(email)

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL)
      expect(wrapper.text()).toContain(email)
      expect(wrapper.text()).toContain(messages.payment.completed.title)
      expect(refreshes()).toBe(2)
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

describe('CheckoutSuccess (default layout)', () => {
  const block = parseSfc(resolve(REPO, 'app/components/Storefront/CheckoutSuccess.vue')).customBlocks.find(b => b.type === 'i18n')!
  const messages = YAML.parse(block.content).el
  const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

  const mount = () => mountSuspended(CheckoutSuccess, { route: false })

  /** Each step of "what happens next": its title and UTimeline's state for it. */
  const steps = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    wrapper.findAll('[data-slot="item"]').map(item => ({
      title: item.get('[data-slot="title"]').text(),
      state: item.attributes('data-state') ?? '',
    }))

  /** The amount beside the summary row named `label`. */
  const total = (wrapper: Awaited<ReturnType<typeof mount>>, label: string) =>
    wrapper.findAll('dt').find(dt => dt.text() === label)?.element.nextElementSibling?.textContent?.trim()

  beforeEach(() => {
    clearNuxtData()
    localStorage.clear()
    session.loggedIn = false
    route.params = { uuid: UUID }
    route.query = {}
  })

  it('thanks the shopper by name, with the order number and where the receipt went', async () => {
    serveOrders(order())

    const wrapper = await mount()

    expect(wrapper.get('h1').text()).toBe('Ευχαριστούμε, Maria. Η παραγγελία σου καταχωρήθηκε.')
    expect(wrapper.text()).toContain('Παραγγελία #1001 · στείλαμε την απόδειξη στο maria@example.com.')
  })

  it('says a failed payment charged nothing, once the provider answered', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    route.query = { session_id: 'cs_test_1' }
    serveOrders(order(), order({ paymentStatus: 'FAILED' }))
    const wrapper = await mount()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 2)
    vi.useRealTimers()

    expect(wrapper.get('[role="status"]').text()).toContain(messages.payment.failed.title)
  })

  it('walks a paid order from received through payment to delivery', async () => {
    serveOrders(order({ isPaid: true, paymentStatus: 'COMPLETED', status: 'PROCESSING' }))

    const wrapper = await mount()

    expect(steps(wrapper)).toEqual([
      { title: messages.steps.received, state: 'completed' },
      { title: messages.steps.payment, state: 'active' },
      { title: messages.steps.preparing, state: '' },
      { title: messages.steps.shipped, state: '' },
      { title: messages.steps.delivered, state: '' },
    ])
  })

  it('collects a cash-on-delivery order\'s payment on its last step, at the locker it goes to', async () => {
    serveOrders(order({
      payWayKey: 'PAY_ON_DELIVERY',
      isCollectedOnDelivery: true,
      status: 'SHIPPED',
      shipmentProviderCode: 'boxnow',
      boxnowShipment: makeBoxNowShipment({ locker: makeBoxNowLocker() }),
    }))

    const wrapper = await mount()

    expect(steps(wrapper).map(step => step.title)).toEqual([
      messages.steps.received,
      messages.steps.preparing,
      messages.steps.shipped,
      messages.steps.ready_for_pickup,
    ])
    expect(steps(wrapper).map(step => step.state)).toEqual(['completed', 'completed', 'active', ''])
    expect(wrapper.text()).toContain('BOX NOW')
    expect(wrapper.text()).toContain(`Πληρωμή ${money(42)} κατά την παραλαβή`)
  })

  it('closes the timeline with the date Django promised while the order is on its way', async () => {
    serveOrders(order({
      isPaid: true,
      status: 'SHIPPED',
      trackingDetails: { estimatedDelivery: '2026-10-08' },
    }))

    const wrapper = await mount()

    const last = wrapper.findAll('[data-slot="item"]').at(-1)!
    expect(last.get('time').attributes('datetime')).toBe('2026-10-08T00:00:00.000Z')
    expect(last.text()).toContain('Εκτιμώμενη:')
  })

  it.each(['DELIVERED', 'CANCELED'] as const)('promises no date once the order is %s', async (status) => {
    serveOrders(order({ status, trackingDetails: { estimatedDelivery: '2026-10-08' } }))

    const wrapper = await mount()

    expect(wrapper.text()).not.toContain('Εκτιμώμενη:')
  })

  it('promises no date for an order Django gave none', async () => {
    serveOrders(order({ status: 'PROCESSING', trackingDetails: { estimatedDelivery: null } }))

    const wrapper = await mount()

    expect(wrapper.text()).not.toContain('Εκτιμώμενη:')
  })

  it('lists the lines and what the order came to', async () => {
    serveOrders(order({
      isPaid: true,
      paymentStatus: 'COMPLETED',
      items: [makeOrderItem({ id: 1, quantity: 2, totalPrice: 40 })],
      pricingBreakdown: { discount: 4, loyaltyDiscount: 1, giftCardAmount: 10, shippingCost: 0, paymentMethodFee: 2 },
    }))

    const wrapper = await mount()

    expect(wrapper.text()).toContain(money(40))
    expect(total(wrapper, messages.totals.discounts)).toBe(`−${money(5)}`)
    expect(total(wrapper, messages.totals.gift_card)).toBe(`−${money(10)}`)
    expect(total(wrapper, messages.totals.delivery)).toBe(messages.totals.free)
    expect(total(wrapper, messages.totals.payment_fee)).toBe(money(2))
    expect(total(wrapper, messages.totals.paid)).toBe(money(42))
  })

  it('totals an unpaid order without calling it paid', async () => {
    serveOrders(order({ isPaid: false }))

    const wrapper = await mount()

    expect(total(wrapper, messages.totals.paid)).toBeUndefined()
    expect(total(wrapper, messages.totals.total)).toBe(money(42))
  })

  it.each([
    [true, true],
    [false, false],
  ])('links a signed-in shopper to the order page (signed in: %s)', async (signedIn, linked) => {
    session.loggedIn = signedIn
    serveOrders(order())

    const wrapper = await mount()

    const track = wrapper.findAll('a').find(a => a.text() === messages.actions.track)
    expect(track?.attributes('href')).toBe(linked ? '/account/orders/1001' : undefined)
  })

  it('opens the invoice by the order\'s uuid, so a guest can have it too', async () => {
    serveOrders(order({ hasInvoice: true }))
    const tab = { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
    vi.stubGlobal('open', vi.fn(() => tab))
    const wrapper = await mount()
    api.routes({ '/api/orders/1001/invoice': { downloadUrl: 'https://cdn.example/invoice.pdf' } })

    await wrapper.findAll('button').find(button => button.text() === messages.actions.invoice)!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/orders/1001/invoice')[0]!.options?.query).toEqual({ uuid: UUID })
    expect(tab.location.href).toBe('https://cdn.example/invoice.pdf')
  })

  it('offers no invoice before one exists', async () => {
    serveOrders(order({ hasInvoice: false }))

    const wrapper = await mount()

    expect(wrapper.findAll('button').some(button => button.text() === messages.actions.invoice)).toBe(false)
  })
})
