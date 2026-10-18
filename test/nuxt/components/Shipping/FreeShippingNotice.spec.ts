import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import FreeShippingNotice from '~/components/Shipping/FreeShippingNotice.vue'
import WebsideFreeShippingNotice from '~/components/variants/webside/Shipping/FreeShippingNotice.vue'
import { failWith } from '~~/test/helpers/api'
import { makeCart } from '~~/test/fixtures/cart'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const INFO_URL = '/api/shipping/free-shipping-info'

/**
 * `useFreeShippingInfo` caches under this fixed key with a custom
 * `getCachedData` that serves ANY payload already stored there, so
 * without clearing it every test after the first would render the
 * first test's threshold and never hit the route it registered.
 */
const INFO_KEY = 'shipping:free-shipping-info'

const buildResponse = (overrides: Record<string, unknown> = {}) => ({
  providers: [
    { providerCode: 'boxnow', providerName: 'BOX NOW', kind: 'pickup_point', threshold: 30, priority: 20 },
  ],
  minThreshold: 30,
  maxThreshold: 30,
  currency: 'EUR',
  countryCode: 'GR',
  ...overrides,
})

/** The frozen copy's own `<i18n>` copy (el); the global `$i18n` cannot reach it. */
const euro = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
const COPY = {
  idle: (amount: number) => `Δωρεάν μεταφορικά σε αγορές άνω των ${euro(amount)}`,
  progress: (amount: number) => `Πρόσθεσε ακόμα ${euro(amount)} για δωρεάν μεταφορικά`,
  qualified: 'Έχεις δωρεάν μεταφορικά',
}

/** The frozen copy, pinned as it renders on webside.gr. */
describe('webside FreeShippingNotice', () => {
  const C = WebsideFreeShippingNotice
  beforeEach(() => {
    clearNuxtData(INFO_KEY)
    api.routes({ [INFO_URL]: buildResponse() })
  })

  it('advertises the lowest threshold when no cart total is given (product page)', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.text()).toBe(COPY.idle(30))
    expect(api.callsTo(INFO_URL)).toHaveLength(1)
  })

  it.each([
    { cartTotal: 22, text: () => COPY.progress(8) },
    { cartTotal: 29.99, text: () => COPY.progress(0.01) },
    // Exactly at the threshold the carrier ships free.
    { cartTotal: 30, text: () => COPY.qualified },
    { cartTotal: 50, text: () => COPY.qualified },
  ])('shows the progress towards free delivery for a cart of $cartTotal', async ({ cartTotal, text }) => {
    const wrapper = await mountSuspended(C, { route: false, props: { cartTotal } })

    expect(wrapper.text()).toBe(text())
  })

  it.each([
    { name: 'no carrier advertises a threshold', response: buildResponse({ providers: [], minThreshold: null, maxThreshold: null }) },
    // A zero threshold means "always free" — there is nothing to advertise.
    { name: 'the threshold is 0', response: buildResponse({ minThreshold: 0 }) },
  ])('renders nothing when $name', async ({ response }) => {
    api.routes({ [INFO_URL]: response })

    const wrapper = await mountSuspended(C, { route: false, props: { cartTotal: 10 } })

    expect(api.callsTo(INFO_URL)).toHaveLength(1)
    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[data-slot="root"]').exists()).toBe(false)
  })

  it('renders nothing when the threshold lookup fails', async () => {
    api.routes({ [INFO_URL]: failWith(502) })

    const wrapper = await mountSuspended(C, { route: false, props: { cartTotal: 10 } })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[data-slot="root"]').exists()).toBe(false)
  })
})

/**
 * The Groove Volt meter: how far the cart is from the cheapest
 * free-delivery threshold, in a line over a progress bar. It reads the
 * cart from the store — the cart page, the drawer and the product page
 * (from the client, since its HTML is cached and the cart is per
 * visitor) all render the same meter.
 */
describe('default FreeShippingNotice', () => {
  beforeEach(() => {
    clearNuxtData(INFO_KEY)
    api.routes({ [INFO_URL]: buildResponse() })
    useCartStore().cart = null
  })

  const meter = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
    wrapper.get('[role="progressbar"]')

  it.each([
    { cartTotal: 22, remaining: 8, value: String((22 / 30) * 100) },
    { cartTotal: 29.99, remaining: 0.01, value: String((29.99 / 30) * 100) },
  ])('says what is left for a cart of $cartTotal and fills the meter that far', async ({ cartTotal, remaining, value }) => {
    useCartStore().cart = makeCart({ totalPrice: cartTotal })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe(`Σου λείπουν ${euro(remaining)} για δωρεάν μεταφορικά`)
    expect(meter(wrapper).attributes('aria-valuenow')).toBe(value)
  })

  it('counts a visitor without a cart as 0 € into the threshold', async () => {
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe(`Σου λείπουν ${euro(30)} για δωρεάν μεταφορικά`)
    expect(meter(wrapper).attributes('aria-valuenow')).toBe('0')
  })

  it.each([30, 50])('says delivery is free at or past the threshold (cart of %s), the meter full', async (cartTotal) => {
    useCartStore().cart = makeCart({ totalPrice: cartTotal })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe('Τα μεταφορικά σου είναι δωρεάν')
    expect(meter(wrapper).attributes('aria-valuenow')).toBe('100')
  })

  // Django judges free shipping on the cart's `freeThresholdValue`: the
  // products after promotion and coupon discounts. The gross total told a
  // shopper with a coupon that delivery was free when Django charged it.
  it.each([
    { name: '39,98 €: short by 0,02 €', totalPrice: 39.98, promotionDiscount: 0, text: () => `Σου λείπουν ${euro(0.02)} για δωρεάν μεταφορικά` },
    { name: '40,00 €: delivery is free', totalPrice: 40, promotionDiscount: 0, text: () => 'Τα μεταφορικά σου είναι δωρεάν' },
    { name: '45,00 € less a 6,00 € coupon: short by 1,00 €', totalPrice: 45, promotionDiscount: 6, text: () => `Σου λείπουν ${euro(1)} για δωρεάν μεταφορικά` },
  ])('measures free delivery on the freeThresholdValue of the cart: $name', async ({ totalPrice, promotionDiscount, text }) => {
    api.routes({ [INFO_URL]: buildResponse({ minThreshold: 40 }) })
    useCartStore().cart = makeCart({ totalPrice, promotionDiscount })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe(text())
  })

  it('reads the value Django sent, never recomputes it', async () => {
    api.routes({ [INFO_URL]: buildResponse({ minThreshold: 120 }) })
    useCartStore().cart = makeCart({ totalPrice: 100, promotionDiscount: 60, freeThresholdValue: 110 })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe(`Σου λείπουν ${euro(10)} για δωρεάν μεταφορικά`)
  })

  // Demo store, 2026-10-11: with SHIPFREE applied the meter still asked
  // for 17,63 € more, while checkout charged nothing for delivery.
  it('says delivery is free when a promotion already waives it, below the threshold', async () => {
    useCartStore().cart = makeCart({ totalPrice: 12.37, promotionFreeShipping: true })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe('Τα μεταφορικά σου είναι δωρεάν')
    expect(meter(wrapper).attributes('aria-valuenow')).toBe('100')
  })

  it.each([
    { name: 'no carrier advertises a threshold', reply: () => buildResponse({ providers: [], minThreshold: null, maxThreshold: null }) },
    { name: 'the threshold is 0', reply: () => buildResponse({ minThreshold: 0 }) },
    { name: 'the threshold lookup fails', reply: failWith(502) },
  ])('renders nothing when $name', async ({ reply }) => {
    api.routes({ [INFO_URL]: reply })

    useCartStore().cart = makeCart({ totalPrice: 10 })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })
})
