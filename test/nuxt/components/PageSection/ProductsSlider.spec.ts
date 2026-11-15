import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsSlider from '~/components/PageSection/ProductsSlider.vue'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import type { PRODUCT_STOCK_MODES } from '~~/shared/constants/builder'

/** Stands in for the rail: renders the ids of the products it was handed. */
const RailStub = defineComponent({
  props: { products: { type: Array as () => { id: number }[], default: () => [] } },
  setup: props => () => h('ol', props.products.map(p => h('li', { 'data-product': p.id }))),
})

/** The `products` data setting as the page route hands it over. */
const products = (ids: number[], descriptor: DataDescriptor<'product'>) => ({
  status: ids.length ? 'ok' : 'empty',
  items: ids.map(id => makeProductCard({ id })),
  total: ids.length,
  descriptor,
}) as ResolvedQuery<ProductCard, DataDescriptor<'product'>>

const rule = (ordering: ProductOrdering, stock?: (typeof PRODUCT_STOCK_MODES)[number]): DataDescriptor<'product'> => ({ mode: 'filter', ordering, limit: 8, ...(stock && { stock }) })

const COPY = inlineCopy('app/components/PageSection/ProductsSlider.vue')

const mountSlider = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductsSlider, {
    route: false,
    props: { products: products([7, 8], rule('newest')), ...props },
    global: { stubs: { ProductsRail: RailStub } },
  })

const seeAll = (wrapper: Awaited<ReturnType<typeof mountSlider>>) => {
  const link = wrapper.find('a')
  return [link.text(), link.attributes('href')]
}

/**
 * A rail of products whose heading and "see all" say what it draws, so
 * three rails on one homepage read as three different bands. The copy
 * is the component's own `<i18n>` (el, `inlineCopy`). The rail reads nothing:
 * the page route resolved its products.
 */
describe('PageSection/ProductsSlider', () => {
  beforeEach(() => {
    setTenant()
  })

  it('renders nothing when the list is empty', async () => {
    const wrapper = await mountSlider({ products: products([], rule('newest')) })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  // A rule that hides sold-out products opens the listing filtered the same way.
  it.each([
    ['inStockOnly', '/products?sort=-createdAt&inStock=true'],
    ['inStockFirst', '/products?sort=-createdAt'],
    ['any', '/products?sort=-createdAt'],
  ] as const)('sends "see all" of a rule with stock %s to the matching listing', async (stock, href) => {
    const wrapper = await mountSlider({ products: products([7, 8], rule('newest', stock)) })

    expect(seeAll(wrapper)).toEqual([COPY.all.newest, href])
  })

  it('draws the products it was given', async () => {
    const wrapper = await mountSlider()

    expect(wrapper.findAll('[data-product]').map(li => li.attributes('data-product'))).toEqual(['7', '8'])
  })

  /**
   * The listing sorts by the same fields a rule orders by, so a rail with a
   * listing sort opens the listing in that order and says so; the others
   * have none, so they open the plain listing.
   */
  it.each([
    { ordering: 'newest', link: [COPY.all.newest, '/products?sort=-createdAt'] },
    { ordering: 'mostViewed', link: [COPY.all.mostViewed, '/products?sort=-viewCount'] },
    { ordering: 'mostLiked', link: [COPY.all.mostLiked, '/products?sort=-likesCount'] },
    { ordering: 'discounted', link: [COPY.all_products, '/products'] },
    { ordering: 'topRated', link: [COPY.all_products, '/products'] },
  ] as const)('names a $ordering rail for what it lists and sends "see all" to the matching listing', async ({ ordering, link }) => {
    const wrapper = await mountSlider({ products: products([7, 8], rule(ordering)) })

    expect(wrapper.find('h2').text()).toBe(COPY.heading[ordering])
    expect(seeAll(wrapper)).toEqual(link)
  })

  it('names a hand-picked rail for it, and sends "see all" to the plain listing', async () => {
    const wrapper = await mountSlider({ products: products([7, 8], { mode: 'picked', ids: [7, 8] }) })

    expect(wrapper.find('h2').text()).toBe(COPY.heading.picked)
    expect(seeAll(wrapper)).toEqual([COPY.all_products, '/products'])
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountSlider({ title: 'Τίτλος', heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    expect(seeAll(wrapper)).toEqual(['Δες τα', '/offers'])
  })

  // Only the operator's link replaces where "see all" goes: their words
  // alone keep the rail's listing, its order and its stock filter.
  it.each([
    [rule('newest'), '/products?sort=-createdAt'],
    [rule('newest', 'inStockOnly'), '/products?sort=-createdAt&inStock=true'],
    [rule('topRated', 'inStockOnly'), '/products?inStock=true'],
  ])('keeps the listing of %j when the operator words the link without a target', async (descriptor, href) => {
    const wrapper = await mountSlider({ products: products([7, 8], descriptor), ctaText: 'Δες τα' })

    expect(seeAll(wrapper)).toEqual(['Δες τα', href])
  })

  it('names an operator link without words generically, since it may lead anywhere', async () => {
    const wrapper = await mountSlider({ products: products([7, 8], rule('newest', 'inStockOnly')), ctaLink: '/offers' })

    expect(seeAll(wrapper)).toEqual([COPY.all_products, '/offers'])
  })

  // The colour scheme reaches the band, which draws it as Nuxt UI's subtree
  // switch (`Band.spec.ts`).
  it.each(['dark', 'light'] as const)('draws the band in the %s colour scheme the block sets', async (colorScheme) => {
    const wrapper = await mountSlider({ colorScheme })

    expect(wrapper.get('section').classes()).toContain(colorScheme)
  })
})
