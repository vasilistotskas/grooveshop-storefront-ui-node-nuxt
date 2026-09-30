import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import ProductsSlider from '~/components/PageSection/ProductsSlider.vue'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const PRODUCTS_URL = '/api/products'

/** Stands in for the rail: renders the ids of the products it was handed. */
const RailStub = defineComponent({
  props: { products: { type: Array as () => { id: number }[], default: () => [] } },
  setup: props => () => h('ol', props.products.map(p => h('li', { 'data-product': p.id }))),
})

const mountSlider = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductsSlider, { route: false, props, global: { stubs: { ProductsRail: RailStub } } })

const seeAll = (wrapper: Awaited<ReturnType<typeof mountSlider>>) => {
  const link = wrapper.find('a')
  return [link.text(), link.attributes('href')]
}

/**
 * A rail of products whose heading and "see all" say what it draws, so
 * three rails on one homepage read as three different bands. The copy
 * is the component's own `<i18n>` (el), which the global `$i18n`
 * cannot reach.
 */
describe('PageSection/ProductsSlider', () => {
  beforeEach(() => {
    // `useProductRail` serves a cached payload for its key.
    clearNuxtData()
    api.routes({ [PRODUCTS_URL]: { results: [makeProduct({ id: 7 }), makeProduct({ id: 8 })], count: 2 } })
  })

  it('renders nothing when the query comes back empty', async () => {
    api.routes({ [PRODUCTS_URL]: { results: [], count: 0 } })

    const wrapper = await mountSlider()

    expect(api.callsTo(PRODUCTS_URL)).toHaveLength(1)
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('draws the products it was given', async () => {
    const wrapper = await mountSlider()

    expect(wrapper.findAll('[data-product]').map(li => li.attributes('data-product'))).toEqual(['7', '8'])
  })

  /**
   * The listing sorts by the same fields the rail orders by, so a rail
   * with a listing sort opens the listing in that order and says so;
   * `discounted` and `rating` have none, so they open the plain listing.
   */
  it.each([
    { ordering: 'featured', sort: '-viewCount', heading: 'Επιλεγμένα προϊόντα', link: ['Όλα τα επιλεγμένα', '/products?sort=-viewCount'] },
    { ordering: 'newest', sort: '-createdAt', heading: 'Νέες αφίξεις', link: ['Όλες οι νέες αφίξεις', '/products?sort=-createdAt'] },
    { ordering: 'popular', sort: '-likesCount', heading: 'Δημοφιλή', link: ['Όλα τα δημοφιλή', '/products?sort=-likesCount'] },
    { ordering: 'discounted', sort: '-discountPercent', heading: 'Σε προσφορά', link: ['Όλα τα προϊόντα', '/products'] },
    { ordering: 'rating', sort: '-reviewAverage', heading: 'Κορυφαίες αξιολογήσεις', link: ['Όλα τα προϊόντα', '/products'] },
  ])('orders a $ordering rail by $sort and names it for it', async ({ ordering, sort, heading, link }) => {
    const wrapper = await mountSlider({ ordering })

    expect(api.callsTo(PRODUCTS_URL)[0]!.options.query).toMatchObject({ ordering: sort, pageSize: 8, languageCode: 'el' })
    expect(wrapper.find('h2').text()).toBe(heading)
    expect(seeAll(wrapper)).toEqual(link)
  })

  it('asks only for discounted products on a discounted rail', async () => {
    await mountSlider({ ordering: 'discounted', categoryId: 3, pageSize: 4 })

    expect(api.callsTo(PRODUCTS_URL)[0]!.options.query).toEqual({
      pageSize: 4,
      languageCode: 'el',
      ordering: '-discountPercent',
      category: '3',
      minDiscountPercent: 1,
    })
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountSlider({ title: 'Τίτλος', heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    expect(seeAll(wrapper)).toEqual(['Δες τα', '/offers'])
  })

  it('sends an operator link text without a target to the listing', async () => {
    const wrapper = await mountSlider({ ordering: 'newest', ctaText: 'Δες τα' })

    expect(seeAll(wrapper)).toEqual(['Δες τα', '/products'])
  })
})
