import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import PointsEarned from '~/components/Checkout/PointsEarned.vue'
import WebsidePointsEarned from '~/components/variants/webside/Checkout/PointsEarned.vue'
import { makeCart } from '~~/test/fixtures/cart'
import type { CartItemOverrides } from '~~/test/fixtures/cart'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * "Θα κερδίσεις N πόντους" beside the checkout total: the points the
 * cart earns, summed from one `/api/loyalty/product/:id/points` request
 * per distinct product. It must never promise a reward the backend will
 * not grant — a guest, a plan or setting without loyalty, and a
 * wholesale cart outside the programme all get nothing, and fetch
 * nothing.
 *
 * `$api` (the per-product points), `useRequestApi` (the loyalty
 * settings) and `$fetch` share one `createApiMock`; the cart is the real
 * Pinia store. The webside copy differs only in its Greek-only i18n.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

// The bootstrap plugin chain calls useUserSession too, so the mock
// carries its whole surface.
const session = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { loggedIn: ref(true), user: ref<unknown>({ id: 1 }), session: ref({}), ready: ref(true) }
})
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const loyalty = vi.hoisted(() => ({ setting: 'true', points: {} as Record<number, number | Error> }))

function lines(...items: CartItemOverrides[]) {
  useCartStore().cart = makeCart({ items })
}

describe.each(trees(PointsEarned, WebsidePointsEarned))('$tree Checkout/PointsEarned', ({ C }) => {
  beforeEach(async () => {
    clearNuxtData()
    loyalty.setting = 'true'
    loyalty.points = { 3: 12, 4: 5 }
    setTenant({ loyaltyEnabled: true })
    api.routes({
      // app/plugins/setup.ts watches the session: a sign-in re-reads the
      // cart, a sign-out clears it. Answer with the cart the test set, so
      // those reactions never swap it for an empty one.
      '/api/cart': () => useCartStore().cart,
      '/api/loyalty/settings': () => ({ LOYALTY_ENABLED: loyalty.setting }),
      '/api/loyalty/product/*': (url: string) => {
        const points = loyalty.points[Number(url.split('/')[4])]
        if (points instanceof Error) throw points
        return { potentialPoints: points ?? 0 }
      },
    })
    session.loggedIn.value = true
    await flushPromises()
    lines({ id: 1, quantity: 2, product: { id: 3 } })
  })

  async function mount() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  const pointRequests = () => api.callsTo('/api/loyalty/product/*').map(call => call.url)
  const badge = (wrapper: VueWrapper) => wrapper.find('[data-slot="base"]')

  it('promises the points of every line, times its quantity', async () => {
    const wrapper = await mount()

    expect(pointRequests()).toEqual(['/api/loyalty/product/3/points'])
    expect(wrapper.text()).toContain('Θα κερδίσεις 24 πόντους')
    expect(badge(wrapper).text()).toBe('+24')
  })

  it('asks once per product however many lines carry it', async () => {
    lines({ id: 1, quantity: 1, product: { id: 3 } }, { id: 2, quantity: 2, product: { id: 3 } })
    const wrapper = await mount()

    expect(pointRequests()).toEqual(['/api/loyalty/product/3/points'])
    expect(badge(wrapper).text()).toBe('+36')
  })

  it('counts a product whose points failed to load as zero and still shows the rest', async () => {
    loyalty.points = { 3: new Error('boom'), 4: 5 }
    lines({ id: 1, quantity: 2, product: { id: 3 } }, { id: 2, quantity: 1, product: { id: 4 } })
    const wrapper = await mount()

    expect(pointRequests()).toHaveLength(2)
    expect(badge(wrapper).text()).toBe('+5')
  })

  it('promises nothing when the cart earns no points', async () => {
    loyalty.points = {}
    const wrapper = await mount()

    expect(wrapper.text()).not.toContain('πόντους')
  })

  it('asks for the points of a product added after the step rendered', async () => {
    const wrapper = await mount()

    lines({ id: 1, quantity: 2, product: { id: 3 } }, { id: 2, quantity: 1, product: { id: 4 } })
    await flushPromises()

    // The whole cart is re-asked, the new product included.
    expect(pointRequests()).toEqual([
      '/api/loyalty/product/3/points',
      '/api/loyalty/product/3/points',
      '/api/loyalty/product/4/points',
    ])
    expect(badge(wrapper).text()).toBe('+29')
  })

  it('asks again when the cart holds a different product in the same quantity', async () => {
    const wrapper = await mount()

    lines({ id: 1, quantity: 2, product: { id: 4 } })
    await flushPromises()

    expect(pointRequests().at(-1)).toBe('/api/loyalty/product/4/points')
    expect(badge(wrapper).text()).toBe('+10')
  })

  it('re-counts when a line\'s quantity changes', async () => {
    const wrapper = await mount()

    lines({ id: 1, quantity: 3, product: { id: 3 } })
    await flushPromises()

    expect(badge(wrapper).text()).toBe('+36')
  })

  describe('never promises, or fetches, a reward the backend will not grant', () => {
    it.each([
      ['a guest', () => { session.loggedIn.value = false }],
      ['a plan without loyalty', () => setTenant({ loyaltyEnabled: false })],
      ['a merchant who turned loyalty off', () => { loyalty.setting = 'false' }],
    ])('for %s', async (_case, arrange) => {
      arrange()
      // A sign-out empties the cart (app/plugins/setup.ts); put the line
      // back so only the gate under test can stop the request.
      await flushPromises()
      lines({ id: 1, quantity: 2, product: { id: 3 } })
      const wrapper = await mount()

      expect(pointRequests()).toEqual([])
      expect(wrapper.text()).not.toContain('πόντους')
    })

    it('for a wholesale cart outside the programme', async () => {
      useCartStore().cart = makeCart({
        items: [{ quantity: 2, product: { id: 3 } }],
        b2bPricing: { applied: true, groupName: 'Wholesale', allowPromotions: false, allowLoyalty: false },
      })
      const wrapper = await mount()

      expect(pointRequests()).toEqual([])
      expect(wrapper.text()).not.toContain('πόντους')
    })
  })

  it.each([
    ['the merchant lets wholesale carts earn', { applied: true, groupName: 'Wholesale', allowPromotions: false, allowLoyalty: true }],
    ['the wholesale block never applied', { applied: false, allowLoyalty: false }],
  ])('promises points again when %s', async (_case, b2bPricing) => {
    useCartStore().cart = makeCart({ items: [{ quantity: 2, product: { id: 3 } }], b2bPricing })
    const wrapper = await mount()

    expect(badge(wrapper).text()).toBe('+24')
  })
})
