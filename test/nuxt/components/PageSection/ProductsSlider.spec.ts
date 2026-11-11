import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsSlider from '~/components/PageSection/ProductsSlider.vue'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

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

const rule = (ordering: ProductOrdering): DataDescriptor<'product'> => ({ mode: 'filter', ordering, limit: 8 })

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
 * is the component's own `<i18n>` (el), which the global `$i18n`
 * cannot reach. The rail reads nothing: the page route resolved its products.
 */
describe('PageSection/ProductsSlider', () => {
  beforeEach(() => {
    setTenant()
  })

  it('renders nothing when the list is empty', async () => {
    const wrapper = await mountSlider({ products: products([], rule('newest')) })

    expect(wrapper.find('section').exists()).toBe(false)
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
    { ordering: 'newest', heading: 'Νέες αφίξεις', link: ['Όλες οι νέες αφίξεις', '/products?sort=-createdAt'] },
    { ordering: 'mostViewed', heading: 'Δημοφιλή', link: ['Όλα τα δημοφιλή', '/products?sort=-viewCount'] },
    { ordering: 'mostLiked', heading: 'Αγαπημένα', link: ['Όλα τα αγαπημένα', '/products?sort=-likesCount'] },
    { ordering: 'discounted', heading: 'Σε προσφορά', link: ['Όλα τα προϊόντα', '/products'] },
    { ordering: 'topRated', heading: 'Κορυφαίες αξιολογήσεις', link: ['Όλα τα προϊόντα', '/products'] },
  ] as const)('names a $ordering rail for what it lists and sends "see all" to the matching listing', async ({ ordering, heading, link }) => {
    const wrapper = await mountSlider({ products: products([7, 8], rule(ordering)) })

    expect(wrapper.find('h2').text()).toBe(heading)
    expect(seeAll(wrapper)).toEqual(link)
  })

  it('names a hand-picked rail for it, and sends "see all" to the plain listing', async () => {
    const wrapper = await mountSlider({ products: products([7, 8], { mode: 'picked', ids: [7, 8] }) })

    expect(wrapper.find('h2').text()).toBe('Επιλεγμένα προϊόντα')
    expect(seeAll(wrapper)).toEqual(['Όλα τα προϊόντα', '/products'])
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountSlider({ title: 'Τίτλος', heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    expect(seeAll(wrapper)).toEqual(['Δες τα', '/offers'])
  })

  it('sends an operator link text without a target to the listing', async () => {
    const wrapper = await mountSlider({ ctaText: 'Δες τα' })

    expect(seeAll(wrapper)).toEqual(['Δες τα', '/products'])
  })

  // The colour scheme reaches the band, which draws it as Nuxt UI's subtree
  // switch (`Band.spec.ts`).
  it.each(['dark', 'light'] as const)('draws the band in the %s colour scheme the block sets', async (colorScheme) => {
    const wrapper = await mountSlider({ colorScheme })

    expect(wrapper.get('section').classes()).toContain(colorScheme)
  })
})
