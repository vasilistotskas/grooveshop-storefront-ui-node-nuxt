import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Suggestions from '~/components/Product/Suggestions.vue'
import WebsideSuggestions from '~/components/variants/webside/Product/Suggestions.vue'
import type { Product, SurfaceEnum } from '~~/shared/openapi/types.gen'
import { makeProduct } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'

const IMPRESSION_ID = '0f6d3d3e-6d2b-4c4e-9c2a-2a1f4b6c8d90'
/** The strip's `useApi` key for `{ surface: 'pdp', seedId: 1 }`. */
const PDP_KEY = 'recommendations:pdp:1:'

// The API's parler shape: the name lives under `translations.<locale>`,
// never flat. A flat `name` here hid empty tile titles and alt-less
// images on the live product page (Ahrefs "Missing alt text",
// 2026-09-11).
const named = (id: number, name: string, overrides: Parameters<typeof makeProduct>[0] = {}) =>
  makeProduct({
    id,
    translations: { el: { name, description: '', seoTitle: '', seoDescription: '', seoKeywords: '' } },
    mainImagePath: `media/uploads/products/${id}.png`,
    ...overrides,
  })

// VAT-free so the struck list price (`product.price`) and the
// pre-discount gross coincide: 40 € less 25 % is 30 €.
const POT = named(2, 'Γλάστρα', { reviewAverage: 8, reviewCount: 12 })
const SOIL = named(3, 'Χώμα', { price: 40, discountPercent: 25, vatPercent: 0 })

const payload = () => ({
  surface: 'pdp',
  impressionId: IMPRESSION_ID,
  items: [
    { product: POT, reason: { strategy: 'curated', relationType: 'complementary', score: 1 } },
    { product: SOIL, reason: { strategy: 'category', relationType: null, score: 0.8 } },
  ],
})

// `useApi` transports through `$fetch` and the feedback POSTs go
// through `$api`: one mock sees both, so `registerEndpoint` is unused.
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { b2bPrice } = vi.hoisted(() => ({
  b2bPrice: vi.fn((_id: number): { finalPrice: string } | undefined => undefined),
}))
mockNuxtImport('useB2BPricing', () => () => ({ register: vi.fn(), priceFor: b2bPrice }))
mockNuxtImport('useUserStore', () => () => ({ getFavouriteIdByProductId: () => null }))

// The favourite and add-to-cart buttons are the store's own components,
// stubbed to the element they hang off; Embla has no layout in
// happy-dom, so the carousel renders every slide through the slot.
const addToCartStub = {
  props: ['product', 'text', 'iconOnly'],
  template: '<button class="add-to-cart" :aria-label="text" />',
}
// Nuxt resolves `Lazy*` to the same component, so both names are
// stubbed — whichever the resolver registers first wins.
const stubsFor = (own: (name: string) => string) => ({
  ImgWithFallback: true,
  [own('ButtonProductAddToFavourite')]: true,
  [`Lazy${own('ButtonProductAddToFavourite')}`]: true,
  [own('ButtonProductAddToCart')]: addToCartStub,
  [`Lazy${own('ButtonProductAddToCart')}`]: addToCartStub,
  LazyUCarousel: {
    props: ['items'],
    template: '<div class="carousel"><slot v-for="(item, index) in items" :item="item" :index="index" /></div>',
  },
})

/** The strip's props (`Product/Suggestions.vue` `defineProps`). */
type StripProps = { surface: SurfaceEnum, seedId?: number, items?: Product[], limit?: number, hideTitle?: boolean }

const events = () => api.callsTo('/api/analytics/recommendation-event')
const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

describe.each(trees(Suggestions, WebsideSuggestions))('$tree Product/Suggestions', ({ tree, C, own }) => {
  const mountStrip = async (props: StripProps = { surface: 'pdp', seedId: 1 }) => {
    const wrapper = await mountSuspended(C, { props, global: { stubs: stubsFor(own) }, route: false })
    await flushPromises()
    return wrapper
  }

  /**
   * Mount the strip the way the server-rendered product page hands it
   * over: the payload already carries the answer for its key. `hydrating`
   * is whether the app is still hydrating when the strip's setup runs.
   */
  const mountOverServerPayload = async (hydrating: boolean) => {
    const nuxtApp = useNuxtApp()
    nuxtApp.payload.data[PDP_KEY] = payload()
    const wasHydrating = nuxtApp.isHydrating
    nuxtApp.isHydrating = hydrating
    try {
      return await mountStrip()
    }
    finally {
      nuxtApp.isHydrating = wasHydrating
    }
  }

  beforeEach(() => {
    clearNuxtData()
    api.routes({
      '/api/products/1/recommendations': () => payload(),
      '/api/products/9/recommendations': () => ({ surface: 'pdp', impressionId: IMPRESSION_ID, items: [] }),
    })
  })

  it('renders the Greek title and one tile per item: name, reason, rating', async () => {
    const wrapper = await mountStrip()

    expect(wrapper.find('h2').text()).toBe('Μπορεί να σου αρέσουν')
    const tiles = wrapper.findAll('article')
    expect(tiles).toHaveLength(2)
    expect(tiles[0]!.find('h3').text()).toBe('Γλάστρα')
    expect(tiles[0]!.find('p').text()).toBe('Ταιριάζει με')
    expect(tiles[0]!.text()).toContain('(12)')
    expect(tiles[1]!.find('h3').text()).toBe('Χώμα')
    expect(tiles[1]!.find('p').text()).toBe('Ίδια κατηγορία')
  })

  it('strikes the list price through beside the final price of a discounted tile only', async () => {
    const wrapper = await mountStrip()

    const [pot, soil] = wrapper.findAll('article')
    expect(soil!.find('.line-through').text()).toBe(money(40))
    expect(soil!.find('.font-bold').text()).toBe(money(30))
    expect(pot!.find('.line-through').exists()).toBe(false)
    expect(pot!.find('.font-bold').text()).toBe(money(POT.finalPrice))
  })

  it('shows a lower wholesale price with the retail price struck through', async () => {
    b2bPrice.mockImplementation(id => (id === 2 ? { finalPrice: '20' } : undefined))

    const wrapper = await mountStrip()

    const pot = wrapper.findAll('article')[0]!
    expect(pot.find('.font-bold').text()).toBe(money(20))
    expect(pot.find('.line-through').text()).toBe(money(POT.finalPrice))
  })

  it('names each image and the add-to-cart control after the product', async () => {
    const wrapper = await mountStrip()

    const alts = wrapper.findAll('img-with-fallback-stub').map(img => img.attributes('alt'))
    expect(alts).toEqual(['Γλάστρα', 'Χώμα'])
    const buttons = wrapper.findAll('button.add-to-cart')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.attributes('aria-label')).toBe('Προσθήκη στο καλάθι')
  })

  it('asks for the surface and the limit, and labels the section itself when the title is hidden', async () => {
    const wrapper = await mountStrip({ surface: 'pdp', seedId: 1, limit: 4, hideTitle: true })

    expect(api.callsTo('/api/products/1/recommendations')).toEqual([
      { url: '/api/products/1/recommendations', options: expect.objectContaining({ query: { surface: 'pdp', limit: 4 } }) },
    ])
    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.find('section').attributes('aria-label')).toBe('Μπορεί να σου αρέσουν')
    expect(wrapper.find('section').attributes('aria-labelledby')).toBeUndefined()
  })

  it('reports one impression for the whole strip when mounted over the server payload', async () => {
    await mountOverServerPayload(true)

    const calls = events()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.options).toMatchObject({ method: 'POST', keepalive: true })
    expect(calls[0]!.options.body).toEqual({
      impressionId: IMPRESSION_ID,
      surface: 'pdp',
      kind: 'impression',
      seedId: 1,
      items: [
        { productId: 2, strategy: 'curated', position: 0 },
        { productId: 3, strategy: 'category', position: 1 },
      ],
    })
    // The payload answered the key: the strip did not ask again.
    expect(api.callsTo('/api/products/1/recommendations')).toHaveLength(0)
  })

  // `hydrate-on-visible` runs the strip's setup after the app finished
  // hydrating; only `getCachedData: payloadCachedData` still reads the
  // server payload then. The frozen copy lacks it (reported to the
  // owner), so this is not a webside contract.
  it.runIf(tree === 'default')('still reads the server payload when set up after hydration (hydrate-on-visible)', async () => {
    const wrapper = await mountOverServerPayload(false)

    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(events()).toHaveLength(1)
    expect(api.callsTo('/api/products/1/recommendations')).toHaveLength(0)
  })

  it('reports a click on a tile with its position and echoes the impression', async () => {
    const wrapper = await mountStrip()
    api.mockClear()

    await wrapper.findAll('article h3')[1]!.trigger('click')

    const calls = events()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.options.body).toMatchObject({ impressionId: IMPRESSION_ID, kind: 'click' })
    expect(calls[0]!.options.body.items).toEqual([{ productId: 3, strategy: 'category', position: 1 }])
  })

  it('renders nothing and reports nothing when the store has nothing to show', async () => {
    const wrapper = await mountStrip({ surface: 'pdp', seedId: 9 })

    expect(api.callsTo('/api/products/9/recommendations')).toHaveLength(1)
    expect(wrapper.find('section').exists()).toBe(false)
    expect(events()).toHaveLength(0)
  })

  it('renders passed items without a reason, a fetch or a report (the cart path)', async () => {
    const wrapper = await mountStrip({ surface: 'cart', items: [named(7, 'Λίπασμα'), named(8, 'Σπόροι')], limit: 1 })

    expect(wrapper.find('h2').text()).toBe('Πρόσθεσε στην παραγγελία σου')
    const tiles = wrapper.findAll('article')
    expect(tiles.map(tile => tile.find('h3').text())).toEqual(['Λίπασμα'])
    expect(tiles[0]!.find('p').exists()).toBe(false)

    await tiles[0]!.find('h3').trigger('click')

    expect(api.callsTo('/api/products/*')).toHaveLength(0)
    expect(events()).toHaveLength(0)
  })
})
