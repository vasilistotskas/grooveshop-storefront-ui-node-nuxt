import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsGrid from '~/components/PageSection/ProductsGrid.vue'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

/** Stands in for a product card: shows the product id and the add-to-cart choice. */
const CardStub = defineComponent({
  props: { product: { type: Object, required: true }, showAddToCartButton: Boolean },
  setup: props => () => h('li', {
    'data-product': (props.product as { id: number }).id,
    'data-add-to-cart': String(props.showAddToCartButton),
  }),
})

const newest: DataDescriptor<'product'> = { mode: 'filter', ordering: 'newest', limit: 8 }

/** The `products` data setting as the page route hands it over. */
const products = (ids: number[], descriptor: DataDescriptor<'product'> = newest) => ({
  status: ids.length ? 'ok' : 'empty',
  items: ids.map(id => makeProductCard({ id })),
  total: ids.length,
  descriptor,
}) as ResolvedQuery<ProductCard, DataDescriptor<'product'>>

const mountGrid = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductsGrid, { route: false, props: { products: products([7, 8]), ...props }, global: { stubs: { ProductCard: CardStub } } })

/**
 * `products_grid` (and `featured_products`, which is the same band): the
 * products a rule or a hand-picked list came to, drawn as a grid. The band
 * reads nothing: the page route resolved its `products`. The copy is the
 * component's own `<i18n>` (el), which the global `$i18n` cannot reach.
 */
describe('PageSection/ProductsGrid', () => {
  beforeEach(() => {
    setTenant()
  })

  it('draws the products it was given, with a link to the listing', async () => {
    const wrapper = await mountGrid()

    expect(wrapper.findAll('[data-product]').map(li => li.attributes('data-product'))).toEqual(['7', '8'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Όλα τα προϊόντα', '/products'])
  })

  it.each<[DataDescriptor<'product'>, string]>([
    [{ mode: 'filter', ordering: 'newest', limit: 8 }, 'Νέες αφίξεις'],
    [{ mode: 'filter', ordering: 'mostViewed', limit: 8 }, 'Δημοφιλή'],
    [{ mode: 'filter', ordering: 'mostLiked', limit: 8 }, 'Αγαπημένα'],
    [{ mode: 'filter', ordering: 'topRated', limit: 8 }, 'Κορυφαίες αξιολογήσεις'],
    [{ mode: 'filter', ordering: 'discounted', limit: 8 }, 'Σε προσφορά'],
    [{ mode: 'filter', ordering: 'priceAsc', limit: 8 }, 'Οι καλύτερες τιμές'],
    [{ mode: 'filter', ordering: 'priceDesc', limit: 8 }, 'Premium επιλογές'],
    [{ mode: 'picked', ids: [7, 8] }, 'Επιλεγμένα προϊόντα'],
  ])('names a band by what it lists: %j is %s', async (descriptor, heading) => {
    const wrapper = await mountGrid({ products: products([7, 8], descriptor) })

    expect(wrapper.find('h2').text()).toBe(heading)
  })

  it('passes the operator\'s add-to-cart choice to every card', async () => {
    const wrapper = await mountGrid({ showAddToCart: false })

    expect(wrapper.findAll('[data-add-to-cart]').map(li => li.attributes('data-add-to-cart'))).toEqual(['false', 'false'])
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountGrid({ heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Δες τα', '/offers'])
  })

  it('renders nothing when the list is empty', async () => {
    const wrapper = await mountGrid({ products: products([]) })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  // The colour scheme reaches the band, which draws it as Nuxt UI's subtree
  // switch (`Band.spec.ts`).
  it.each(['dark', 'light'] as const)('draws the band in the %s colour scheme the block sets', async (colorScheme) => {
    const wrapper = await mountGrid({ colorScheme })

    expect(wrapper.get('section').classes()).toContain(colorScheme)
  })
})
