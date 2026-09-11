import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import Suggestions from '~/components/Product/Suggestions.vue'

const IMPRESSION_ID = '0f6d3d3e-6d2b-4c4e-9c2a-2a1f4b6c8d90'

// The API's parler shape: the name lives under `translations.<locale>`,
// never flat. A flat `name` here hid empty tile titles and alt-less
// images on the live product page (Ahrefs "Missing alt text",
// 2026-09-11).
const product = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  slug: `product-${id}`,
  translations: { el: { name } },
  price: 10 * id,
  finalPrice: 10 * id,
  mainImagePath: `media/uploads/products/${id}.png`,
  stock: 5,
  reviewAverage: 0,
  reviewCount: 0,
  ...extra,
})

const payload = {
  surface: 'pdp',
  impressionId: IMPRESSION_ID,
  items: [
    {
      product: product(2, 'Γλάστρα', { reviewAverage: 8, reviewCount: 12 }),
      reason: { strategy: 'curated', relationType: 'complementary', score: 1 },
    },
    {
      product: product(3, 'Χώμα', { price: 40, finalPrice: 30 }),
      reason: { strategy: 'category', relationType: null, score: 0.8 },
    },
  ],
}

// useFetch routes through the mocked $fetch auto-import, so the
// suggestions payload AND the feedback POSTs both land here.
const { mockFetch, recommendations } = vi.hoisted(() => {
  const recommendations = { value: null as unknown }
  return {
    recommendations,
    mockFetch: vi.fn((url: unknown, _options?: unknown) => {
      if (String(url).includes('/recommendations')) {
        return Promise.resolve(recommendations.value)
      }
      return Promise.resolve({})
    }),
  }
})
mockNuxtImport('$fetch', () => mockFetch)
mockNuxtImport('useB2BPricing', () => () => ({
  register: vi.fn(),
  priceFor: () => undefined,
}))
mockNuxtImport('useUserStore', () => () => ({
  getFavouriteIdByProductId: () => null,
}))

registerEndpoint('/api/products/1/recommendations', () => recommendations.value as Record<string, unknown>)
registerEndpoint('/api/products/9/recommendations', () => recommendations.value as Record<string, unknown>)

// The strip's own contract is under test: the tiles it renders from
// the payload and the feedback it reports. The favourite and
// add-to-cart buttons are the store's own components, stubbed to the
// element they hang off; Embla has no layout in jsdom, so the
// carousel renders every slide through the slot.
const addToCartStub = {
  props: ['product', 'text', 'iconOnly'],
  template: '<button class="add-to-cart" :aria-label="text" />',
}
// Nuxt resolves ``Lazy*`` to the same component, so both names are
// stubbed — whichever the resolver registers first wins.
const stubs = {
  ImgWithFallback: true,
  ButtonProductAddToFavourite: true,
  LazyButtonProductAddToFavourite: true,
  ButtonProductAddToCart: addToCartStub,
  LazyButtonProductAddToCart: addToCartStub,
  LazyUCarousel: {
    props: ['items'],
    template: '<div class="carousel"><slot v-for="(item, index) in items" :item="item" :index="index" /></div>',
  },
}

const eventCalls = () =>
  mockFetch.mock.calls.filter(call => String(call[0]).includes('/api/analytics/recommendation-event'))

describe('ProductSuggestions', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    recommendations.value = payload
  })

  it('renders the Greek title and one tile per item: name, reason, rating, price', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 1 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('Μπορεί να σου αρέσουν')
    const tiles = wrapper.findAll('article')
    expect(tiles).toHaveLength(2)
    expect(tiles[0]!.text()).toContain('Γλάστρα')
    expect(tiles[0]!.text()).toContain('Ταιριάζει με')
    expect(tiles[0]!.text()).toContain('(12)')
    expect(tiles[1]!.text()).toContain('Χώμα')
    expect(tiles[1]!.text()).toContain('Ίδια κατηγορία')
    // A discounted tile shows the list price struck through beside
    // the final price.
    expect(tiles[1]!.find('.line-through').exists()).toBe(true)
    expect(tiles[0]!.find('.line-through').exists()).toBe(false)
  })

  it('names each image and the add-to-cart control after the product', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 1 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    const alts = wrapper.findAll('img-with-fallback-stub').map(img => img.attributes('alt'))
    expect(alts).toEqual(['Γλάστρα', 'Χώμα'])
    expect(wrapper.findAll('button.add-to-cart')).toHaveLength(2)
    expect(wrapper.find('button.add-to-cart').attributes('aria-label')).toBe('Προσθήκη στο καλάθι')
  })

  it('reports one impression for the whole strip when shown', async () => {
    await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 1 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    const calls = eventCalls()
    expect(calls).toHaveLength(1)
    const options = calls[0]![1] as { body: Record<string, unknown>, keepalive: boolean }
    expect(options.keepalive).toBe(true)
    expect(options.body).toMatchObject({
      impressionId: IMPRESSION_ID,
      surface: 'pdp',
      kind: 'impression',
      seedId: 1,
    })
    expect(options.body.items).toEqual([
      { productId: 2, strategy: 'curated', position: 0 },
      { productId: 3, strategy: 'category', position: 1 },
    ])
  })

  it('reports a click on a tile with its position and echoes the impression', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 1 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    mockFetch.mockClear()

    await wrapper.findAll('article h3')[1]!.trigger('click')

    const calls = eventCalls()
    expect(calls).toHaveLength(1)
    const options = calls[0]![1] as { body: Record<string, unknown> }
    expect(options.body).toMatchObject({ impressionId: IMPRESSION_ID, kind: 'click' })
    expect(options.body.items).toEqual([{ productId: 3, strategy: 'category', position: 1 }])
  })

  it('renders nothing and reports nothing when the store has nothing to show', async () => {
    recommendations.value = { surface: 'pdp', impressionId: IMPRESSION_ID, items: [] }
    // A different seed: useFetch keys on it, and the Nuxt app is shared
    // across this file's tests, so seed 1's payload would be reused.
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 9 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.find('section').exists()).toBe(false)
    expect(eventCalls()).toHaveLength(0)
  })

  it('renders passed items without a reason, a fetch or a report (the cart path)', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'cart', items: [product(7, 'Λίπασμα') as unknown as Product] },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('Πρόσθεσε στην παραγγελία σου')
    expect(wrapper.text()).toContain('Λίπασμα')
    expect(wrapper.findAll('article p')).toHaveLength(0)
    expect(mockFetch.mock.calls.some(call => String(call[0]).includes('/recommendations'))).toBe(false)
    expect(eventCalls()).toHaveLength(0)
  })
})
