import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import Suggestions from '~/components/Product/Suggestions.vue'

const IMPRESSION_ID = '0f6d3d3e-6d2b-4c4e-9c2a-2a1f4b6c8d90'

const product = (id: number, name: string) => ({
  id,
  slug: `product-${id}`,
  name,
  finalPrice: 10 * id,
  mainImagePath: '',
  stock: 5,
})

const payload = {
  surface: 'pdp',
  impressionId: IMPRESSION_ID,
  items: [
    {
      product: product(2, 'Γλάστρα'),
      reason: { strategy: 'curated', relationType: 'complementary', score: 1 },
    },
    {
      product: product(3, 'Χώμα'),
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

registerEndpoint('/api/products/1/recommendations', () => recommendations.value as Record<string, unknown>)
registerEndpoint('/api/products/9/recommendations', () => recommendations.value as Record<string, unknown>)

// Embla has no layout in jsdom; render every slide through the slot.
const stubs = {
  ImgWithFallback: true,
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

  it('renders the Greek title, one tile per item and the reason badge', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 1 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('Μπορεί να σου αρέσουν')
    expect(wrapper.findAll('a')).toHaveLength(2)
    expect(wrapper.text()).toContain('Ταιριάζει με')
    expect(wrapper.text()).toContain('Ίδια κατηγορία')
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

  it('reports a click with the tile position and echoes the impression', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'pdp', seedId: 1 },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    mockFetch.mockClear()

    await wrapper.findAll('a')[1]!.trigger('click')

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

  it('renders passed items without fetching or reporting (the cart path)', async () => {
    const wrapper = await mountSuspended(Suggestions, {
      props: { surface: 'cart', items: [product(7, 'Λίπασμα') as unknown as Product] },
      global: { stubs },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('Πρόσθεσε στην παραγγελία σου')
    expect(wrapper.text()).toContain('Λίπασμα')
    expect(wrapper.findAllComponents({ name: 'UBadge' })).toHaveLength(0)
    expect(mockFetch.mock.calls.some(call => String(call[0]).includes('/recommendations'))).toBe(false)
    expect(eventCalls()).toHaveLength(0)
  })
})
