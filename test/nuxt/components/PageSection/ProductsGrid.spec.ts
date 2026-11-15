import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsGrid from '~/components/PageSection/ProductsGrid.vue'
import { makeProductCard, makeProductCategory } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'
import { inlineCopy } from '~~/test/helpers/inlineCopy'

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

const COPY = inlineCopy('app/components/PageSection/ProductsGrid.vue')

const mountGrid = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductsGrid, { route: false, props: { products: products([7, 8]), ...props }, global: { stubs: { ProductCard: CardStub } } })

/**
 * `products_grid` (and `featured_products`, which is the same band): the
 * products a rule or a hand-picked list came to, drawn as a grid. The band
 * reads nothing: the page route resolved its `products`. The copy is the
 * component's own `<i18n>` (el, `inlineCopy`).
 */
describe('PageSection/ProductsGrid', () => {
  beforeEach(() => {
    setTenant()
  })

  it('sends "see all" of a rule that hides sold-out products to the listing of what is in stock', async () => {
    const wrapper = await mountGrid({ products: products([7, 8], { ...newest, stock: 'inStockOnly' }) })

    expect(wrapper.find('a').attributes('href')).toBe('/products?inStock=true')
  })

  it('draws the products it was given, with a link to the listing', async () => {
    const wrapper = await mountGrid()

    expect(wrapper.findAll('[data-product]').map(li => li.attributes('data-product'))).toEqual(['7', '8'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([COPY.all_products, '/products'])
  })

  it.each<[DataDescriptor<'product'>, string]>([
    [{ mode: 'filter', ordering: 'newest', limit: 8 }, 'newest'],
    [{ mode: 'filter', ordering: 'mostViewed', limit: 8 }, 'mostViewed'],
    [{ mode: 'filter', ordering: 'mostLiked', limit: 8 }, 'mostLiked'],
    [{ mode: 'filter', ordering: 'topRated', limit: 8 }, 'topRated'],
    [{ mode: 'filter', ordering: 'discounted', limit: 8 }, 'discounted'],
    [{ mode: 'filter', ordering: 'priceAsc', limit: 8 }, 'priceAsc'],
    [{ mode: 'filter', ordering: 'priceDesc', limit: 8 }, 'priceDesc'],
    [{ mode: 'filter', ordering: 'newest', stock: 'inStockOnly', limit: 8 }, 'newest'],
    [{ mode: 'picked', ids: [7, 8] }, 'picked'],
  ])('names a band by what it lists: %j is the %s heading', async (descriptor, heading) => {
    const wrapper = await mountGrid({ products: products([7, 8], descriptor) })

    expect(wrapper.find('h2').text()).toBe(COPY.heading[heading])
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

  it('keeps the in-stock listing when the operator words the link without a target', async () => {
    const wrapper = await mountGrid({ products: products([7, 8], { ...newest, stock: 'inStockOnly' }), ctaText: 'Δες τα' })

    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Δες τα', '/products?inStock=true'])
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

describe('PageSection/ProductsGrid: phone limit and category tile', () => {
  beforeEach(() => {
    setTenant()
  })

  it('hides the products past the phone\'s limit below sm only', async () => {
    const wrapper = await mountGrid({ products: products([1, 2, 3]), phoneLimit: 2 })

    expect(wrapper.findAll('[data-product]').map(card => card.attributes('data-phone-hidden') !== undefined)).toEqual([false, false, true])
  })

  it('ends the grid with a tile of the categories on a desk', async () => {
    const wrapper = await mountGrid({
      categoryTile: { status: 'ok', descriptor: { mode: 'roots', limit: 4 }, items: [makeProductCategory({ id: 5, slug: 'power-bank', recursiveProductCount: 2 })] },
    })

    const tile = wrapper.get('li.border-dashed')
    expect(tile.classes()).toContain('max-sm:hidden')
    expect(tile.get('a[href*="/products/category/5"]').text()).toContain('2')
  })
})

/**
 * The bold band's link: «Όλα τα προϊόντα» on a desk, «Δες όλα τα προϊόντα» on
 * a phone (the boards), both the block's own wording. A store that wrote its
 * own link text gets that text everywhere.
 */
describe('PageSection/ProductsGrid in the bold look, its link', () => {
  beforeEach(() => {
    setTenant()
  })

  it('says the phone’s own words on a phone and the desk’s on a desk', async () => {
    const wrapper = await mountGrid({ products: products([1, 2]), look: 'bold' })

    // The desk's link sits beside the heading; the phone's is the button
    // under the grid, the last link of the band.
    const links = wrapper.findAll('a[href^="/products"]')
    expect(links.at(-1)!.text()).toBe(COPY.all_products_phone)
    expect(links[0]!.findAll('span').find(span => span.classes().includes('max-sm:hidden'))!.text()).toBe(COPY.all_products)
  })

  it('uses the store’s own link text at every width', async () => {
    const wrapper = await mountGrid({ products: products([1, 2]), look: 'bold', ctaText: 'Στο κατάστημα' })

    expect(wrapper.text()).not.toContain(COPY.all_products_phone)
    expect(wrapper.text()).toContain('Στο κατάστημα')
  })
})
