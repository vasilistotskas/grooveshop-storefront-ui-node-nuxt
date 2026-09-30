import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import ProductsGrid from '~/components/PageSection/ProductsGrid.vue'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const PRODUCTS_URL = '/api/products'

/** Stands in for a product card: shows the product id and the add-to-cart choice. */
const CardStub = defineComponent({
  props: { product: { type: Object, required: true }, showAddToCartButton: Boolean },
  setup: props => () => h('li', {
    'data-product': (props.product as { id: number }).id,
    'data-add-to-cart': String(props.showAddToCartButton),
  }),
})

const mountGrid = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductsGrid, { route: false, props, global: { stubs: { ProductCard: CardStub } } })

/**
 * `products_grid`: the rail's query drawn as a grid. The copy is the
 * component's own `<i18n>` (el), which the global `$i18n` cannot reach.
 */
describe('PageSection/ProductsGrid', () => {
  beforeEach(() => {
    // `useProductRail` serves a cached payload for its key.
    clearNuxtData()
    api.routes({ [PRODUCTS_URL]: { results: [makeProduct({ id: 7 }), makeProduct({ id: 8 })], count: 2 } })
  })

  it('draws the merchant\'s featured products by default, with a link to the listing', async () => {
    const wrapper = await mountGrid()

    expect(api.callsTo(PRODUCTS_URL)[0]!.options.query).toMatchObject({ ordering: '-viewCount', pageSize: 8 })
    expect(wrapper.find('h2').text()).toBe('Επιλεγμένα προϊόντα')
    expect(wrapper.findAll('[data-product]').map(li => li.attributes('data-product'))).toEqual(['7', '8'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Όλα τα προϊόντα', '/products'])
  })

  it('passes the operator\'s add-to-cart choice to every card', async () => {
    const wrapper = await mountGrid({ showAddToCart: false })

    expect(wrapper.findAll('[data-add-to-cart]').map(li => li.attributes('data-add-to-cart'))).toEqual(['false', 'false'])
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountGrid({ ordering: 'newest', heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Δες τα', '/offers'])
  })

  it('renders nothing when the query comes back empty', async () => {
    api.routes({ [PRODUCTS_URL]: { results: [], count: 0 } })

    const wrapper = await mountGrid()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
