import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { resolveSectionComponent } from '~/utils/componentRegistry'
import ProductsGrid from '~/components/variants/webside/PageSection/ProductsGridBand.vue'
import ProductsSlider from '~/components/variants/webside/PageSection/ProductsSliderBand.vue'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

const products = (ids: number[]) => ({
  status: ids.length ? 'ok' : 'empty',
  items: ids.map(id => makeProductCard({ id })),
  total: ids.length,
  descriptor: { mode: 'filter', ordering: 'newest', limit: 8 },
}) as ResolvedQuery<ProductCard, DataDescriptor<'product'>>

/** The band's own copy (el), from its `<i18n>`, which the global `$i18n` cannot reach. */
const NEWEST_HEADING = 'Νέες αφίξεις'

/**
 * webside's bands of products are the platform's bands in webside's own card:
 * the card is all these two files hold, so what a band does is checked once,
 * in the base specs, and here only that it still reaches this design.
 */
describe.each([
  ['the grid', ProductsGrid, 'li'],
  ['the rail', ProductsSlider, 'div'],
])('webside PageSection, %s', (_name, Band, cardElement) => {
  beforeEach(() => {
    setTenant()
  })

  const mountBand = (props: Record<string, unknown> = {}) =>
    mountSuspended(Band, { route: false, props: { products: products([7, 8]), ...props } })

  it('draws webside\'s card for each product, as what its parent can hold', async () => {
    const wrapper = await mountBand()

    expect(wrapper.findAll('.product-card').map(card => card.element.tagName.toLowerCase())).toEqual([cardElement, cardElement])
  })

  it('hands every setting to the platform\'s band: the heading, and a link of the store\'s own', async () => {
    const wrapper = await mountBand({ heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    const link = wrapper.findAll('a').find(anchor => anchor.text() === 'Δες τα')
    expect(link?.attributes('href')).toBe('/offers')
  })

  it('names the band by what it lists when the store did not', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe(NEWEST_HEADING)
  })

  it('takes the add to cart button off the cards when the block turns it off', async () => {
    const withButton = await mountBand()
    const withoutButton = await mountBand({ showAddToCart: false })

    expect(withButton.findAll('.product-card button').length).toBeGreaterThan(withoutButton.findAll('.product-card button').length)
  })

  it('disappears with nothing to list', async () => {
    const wrapper = await mountBand({ products: products([]) })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})

describe('the sections of webside that list products', () => {
  it.each(['products_slider', 'products_grid', 'featured_products'])('%s has a webside design, and stays the base one for another store', (type) => {
    expect(resolveSectionComponent(type, 'webside')).not.toBe(resolveSectionComponent(type, 'demo'))
    expect(resolveSectionComponent(type, 'demo')).toBe(resolveSectionComponent(type))
  })
})
