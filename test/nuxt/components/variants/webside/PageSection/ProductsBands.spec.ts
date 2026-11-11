import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Renderer from '~/components/PageSection/Renderer.vue'
import { makeBuilderSection } from '~~/test/fixtures/builderPage'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

// The card names the alert lazily, which only the module's own mock can replace.
vi.mock('~/components/variants/webside/Product/NotifyMe.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ props: { productId: { type: Number, required: true } }, setup: props => () => h('div', { 'data-notify-me': props.productId }) }) }
})

const products = (ids: number[], overrides: Parameters<typeof makeProductCard>[0] = {}) => ({
  status: ids.length ? 'ok' : 'empty',
  items: ids.map(id => makeProductCard({ id, ...overrides })),
  total: ids.length,
  descriptor: { mode: 'filter', ordering: 'newest', limit: 8 },
}) as ResolvedQuery<ProductCard, DataDescriptor<'product'>>

/** The band's own copy (el), from its `<i18n>`, which the global `$i18n` cannot reach. */
const NEWEST_HEADING = 'Νέες αφίξεις'

/**
 * webside's bands of products are the platform's bands in webside's own card,
 * drawn here as a page draws them: the block type through the component
 * registry, on the store's schema. What a band does is checked once, in the
 * base specs, and here only that it still reaches this design.
 *
 * `.product-card` is webside's card's own class (the default card has none),
 * and the element is the contract: a slide is no list.
 */
describe.each([
  ['products_grid', 'LI', 'OL'],
  ['featured_products', 'LI', 'OL'],
  ['products_slider', 'DIV', 'DIV'],
])('webside\'s %s', (componentType, cardElement, parentElement) => {
  beforeEach(() => {
    setTenant({ schemaName: 'webside' })
    setTenantFeatures({ catalogue: true })
  })

  const mountBand = async (props: Record<string, unknown> = {}) => {
    const wrapper = await mountSuspended(Renderer, {
      route: false,
      props: { section: makeBuilderSection({ componentType, props: { products: products([7, 8]), ...props } }) },
    })
    return wrapper
  }

  const drawn = async (props?: Record<string, unknown>) => {
    const wrapper = await mountBand(props)
    await vi.waitFor(() => expect(wrapper.find('section').exists()).toBe(true), { timeout: 4000 })
    return wrapper
  }

  it('draws webside\'s card for each product, as what its parent can hold', async () => {
    const wrapper = await drawn()
    const cards = wrapper.findAll('.product-card')

    expect(cards.map(card => card.element.tagName)).toEqual([cardElement, cardElement])
    expect(cards[0]!.element.parentElement!.tagName).toBe(parentElement)
  })

  it('hands every setting to the platform\'s band: the heading, and a link of the store\'s own', async () => {
    const wrapper = await drawn({ heading: 'Για σένα', ctaText: 'Δες τα', ctaLink: '/offers' })

    expect(wrapper.find('h2').text()).toBe('Για σένα')
    expect(wrapper.findAll('a').find(anchor => anchor.text() === 'Δες τα')?.attributes('href')).toBe('/offers')
  })

  // webside's band passes its settings through to the platform's, the colour
  // scheme included, so its own cards are drawn in it.
  it.each(['dark', 'light'] as const)('draws the band in the %s colour scheme the block sets', async (colorScheme) => {
    const wrapper = await drawn({ colorScheme })

    expect(wrapper.get('section').classes()).toContain(colorScheme)
  })

  it('names the band by what it lists when the store did not', async () => {
    const wrapper = await drawn()

    expect(wrapper.find('h2').text()).toBe(NEWEST_HEADING)
  })

  it('takes the buy button off the cards when the block turns it off', async () => {
    const withButton = await drawn()
    await vi.waitFor(() => expect(withButton.text()).toContain('Αγορά'), { timeout: 4000 })
    const withoutButton = await drawn({ showAddToCart: false })

    expect(withoutButton.text()).not.toContain('Αγορά')
  })

  it('disappears with nothing to list', async () => {
    const wrapper = await mountBand({ products: products([]) })

    // The section's lazy component settles, and draws nothing of its own.
    await vi.dynamicImportSettled()
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.find('.product-card').exists()).toBe(false)
  })
})

describe('webside\'s product grid', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'webside' })
    setTenantFeatures({ catalogue: true })
  })

  // The classes are the contract: happy-dom lays nothing out. In two columns on
  // a phone this card's corner buttons cover its stock badge.
  it('keeps one column on a phone, as webside\'s listing has it', async () => {
    const wrapper = await mountSuspended(Renderer, {
      route: false,
      props: { section: makeBuilderSection({ componentType: 'products_grid', props: { products: products([7]) } }) },
    })
    await vi.waitFor(() => expect(wrapper.find('.product-card').exists()).toBe(true), { timeout: 4000 })

    const classes = wrapper.find('ol').classes()
    expect(classes).toContain('grid-cols-1')
    expect(classes).not.toContain('grid-cols-2')
  })
})

describe('webside\'s card when a product is sold out', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'webside' })
  })

  const mountSoldOut = async (productAlerts: boolean, stock: number) => {
    setTenantFeatures({ catalogue: true, productAlerts })
    const wrapper = await mountSuspended(Renderer, {
      route: false,
      props: { section: makeBuilderSection({ componentType: 'products_grid', props: { products: products([7], { stock }) } }) },
    })
    await vi.waitFor(() => expect(wrapper.find('.product-card').exists()).toBe(true), { timeout: 4000 })
    await vi.dynamicImportSettled()
    await nextTick()
    return wrapper
  }

  it.each([
    ['offers the restock alert when the store has alerts', true, 0, true],
    ['offers none while it is in stock', true, 5, false],
    ['offers none when the store has no alerts', false, 0, false],
  ])('%s', async (_name, productAlerts, stock, offered) => {
    const wrapper = await mountSoldOut(productAlerts, stock)

    expect(wrapper.find('[data-notify-me="7"]').exists()).toBe(offered)
  })
})
