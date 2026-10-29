import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import FreeShippingNotice from '~/components/Shipping/FreeShippingNotice.vue'
import WebsideFreeShippingNotice from '~/components/variants/webside/Shipping/FreeShippingNotice.vue'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'
import { makeCart, makeFreeShippingProgress } from '~~/test/fixtures/cart'

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

const euro = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

/** Each tree's own `<i18n>` copy (el). */
const COPY = {
  default: {
    progress: (amount: number) => `Σου λείπουν ${euro(amount)} για δωρεάν μεταφορικά`,
    quantity: (count: number) => count === 1 ? 'Σου λείπει 1 τεμάχιο για δωρεάν μεταφορικά' : `Σου λείπουν ${count} τεμάχια για δωρεάν μεταφορικά`,
    qualified: 'Τα μεταφορικά σου είναι δωρεάν',
  },
  webside: {
    progress: (amount: number) => `Πρόσθεσε ακόμα ${euro(amount)} για δωρεάν μεταφορικά`,
    quantity: (count: number) => count === 1 ? 'Πρόσθεσε ακόμα 1 τεμάχιο για δωρεάν μεταφορικά' : `Πρόσθεσε ακόμα ${count} τεμάχια για δωρεάν μεταφορικά`,
    qualified: 'Έχεις δωρεάν μεταφορικά',
  },
}

/**
 * The cart's distance to free delivery, told from the cart's
 * `freeShippingProgress` in both trees: the default reads it from the
 * cart store (the cart page, the drawer and the product page share the
 * meter), webside's cart page passes it in. Never from the store's own
 * threshold: on staging webside, 2026-10-28, that said "30,01 €" while a
 * free-shipping offer from 39 € made it 19,01 €.
 */
describe.each(trees(FreeShippingNotice, WebsideFreeShippingNotice))('$tree FreeShippingNotice on a cart', ({ tree, C }) => {
  const copy = COPY[tree]

  beforeEach(() => {
    clearNuxtData(INFO_KEY)
    // The store's own threshold says 50 €: no case below may show it.
    api.routes({ [INFO_URL]: buildResponse({ minThreshold: 50 }) })
    useCartStore().cart = null
  })

  const mountFor = (progress: Cart['freeShippingProgress']) => {
    if (tree === 'webside') return mountSuspended(C, { route: false, props: { progress } })
    useCartStore().cart = makeCart({ freeShippingProgress: progress })
    return mountSuspended(C, { route: false })
  }

  it.each([
    { name: 'a carrier\'s threshold', progress: makeFreeShippingProgress({ remainingAmount: 30.01, threshold: 50 }), amount: 30.01 },
    { name: 'a cheaper free-shipping offer', progress: makeFreeShippingProgress({ source: 'promotion', remainingAmount: 19.01, threshold: 39 }), amount: 19.01 },
  ])('says what Django says is left, by $name', async ({ progress, amount }) => {
    const wrapper = await mountFor(progress)

    expect(wrapper.text()).toBe(copy.progress(amount))
  })

  it.each([1, 2])('says how many items are left when an offer counts units (%s)', async (count) => {
    const wrapper = await mountFor(makeFreeShippingProgress({ source: 'promotion', remainingAmount: null, remainingQuantity: count, threshold: null }))

    expect(wrapper.text()).toBe(copy.quantity(count))
  })

  it.each([
    { name: 'a threshold reached', progress: makeFreeShippingProgress({ free: true, remainingAmount: null }) },
    // Demo store, 2026-10-11: with SHIPFREE applied the meter still asked
    // for 17,63 € more, while checkout charged nothing for delivery.
    { name: 'an offer waiving it', progress: makeFreeShippingProgress({ free: true, source: 'promotion', remainingAmount: null, threshold: null }) },
  ])('says delivery is free once Django says so: $name', async ({ progress }) => {
    const wrapper = await mountFor(progress)

    expect(wrapper.text()).toBe(copy.qualified)
  })

  it('renders nothing when the cart has no route to free delivery', async () => {
    const wrapper = await mountFor(null)

    expect(wrapper.text()).toBe('')
  })

  it('does not depend on the store\'s threshold lookup', async () => {
    clearNuxtData(INFO_KEY)
    api.routes({ [INFO_URL]: failWith(502) })

    const wrapper = await mountFor(makeFreeShippingProgress({ remainingAmount: 8, threshold: 30 }))

    expect(wrapper.text()).toBe(copy.progress(8))
  })
})

/** Webside's product page: the store's standing promise, no cart. */
describe('webside FreeShippingNotice on the product page', () => {
  const C = WebsideFreeShippingNotice
  beforeEach(() => {
    clearNuxtData(INFO_KEY)
    api.routes({ [INFO_URL]: buildResponse() })
  })

  it('advertises the lowest threshold when no progress is given', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.text()).toBe(`Δωρεάν μεταφορικά σε αγορές άνω των ${euro(30)}`)
    expect(api.callsTo(INFO_URL)).toHaveLength(1)
  })

  it.each([
    { name: 'no carrier advertises a threshold', reply: () => buildResponse({ providers: [], minThreshold: null, maxThreshold: null }) },
    // A zero threshold means "always free" — there is nothing to advertise.
    { name: 'the threshold is 0', reply: () => buildResponse({ minThreshold: 0 }) },
    { name: 'the threshold lookup fails', reply: failWith(502) },
  ])('renders nothing when $name', async ({ reply }) => {
    api.routes({ [INFO_URL]: reply })

    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[data-slot="root"]').exists()).toBe(false)
  })
})

/**
 * The default meter: a line over a progress bar. A visitor with no cart
 * (the product page) is told the store's own threshold, which is what
 * Django's progress says of an empty cart.
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
    { remaining: 8, threshold: 30, value: String((22 / 30) * 100) },
    { remaining: 19.01, threshold: 39, value: String(((39 - 19.01) / 39) * 100) },
  ])('fills the meter to the route\'s threshold ($remaining of $threshold left)', async ({ remaining, threshold, value }) => {
    useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress({ remainingAmount: remaining, threshold }) })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(meter(wrapper).attributes('aria-valuenow')).toBe(value)
  })

  it('fills the meter once delivery is free', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress({ free: true, source: 'promotion', remainingAmount: null, threshold: null }) })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(meter(wrapper).attributes('aria-valuenow')).toBe('100')
  })

  it('draws no meter for a units route, which has no amount to fill', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress({ source: 'promotion', remainingAmount: null, remainingQuantity: 2, threshold: null }) })
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('counts a visitor without a cart as 0 € into the store\'s threshold', async () => {
    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe(`Σου λείπουν ${euro(30)} για δωρεάν μεταφορικά`)
    expect(meter(wrapper).attributes('aria-valuenow')).toBe('0')
  })

  it.each([
    { name: 'no carrier advertises a threshold', reply: () => buildResponse({ providers: [], minThreshold: null, maxThreshold: null }) },
    { name: 'the threshold is 0', reply: () => buildResponse({ minThreshold: 0 }) },
    { name: 'the threshold lookup fails', reply: failWith(502) },
  ])('renders nothing for a visitor without a cart when $name', async ({ reply }) => {
    api.routes({ [INFO_URL]: reply })

    const wrapper = await mountSuspended(FreeShippingNotice, { route: false })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })
})
