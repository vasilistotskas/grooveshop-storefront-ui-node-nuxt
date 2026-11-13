import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Spotlight from '~/components/Product/Spotlight.vue'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { inlineT } from '~~/test/helpers/inlineCopy'

/**
 * One product on its own: name, rating, stock, price and the store's own way
 * to buy it. The buy controls are the DESIGN's (`resolvePart`): each part is
 * replaced by a stub naming which design's component it is and the props it
 * got, so the spec proves both which component a store gets and that each
 * design's component is handed the props it declares.
 */
// `resolvePart` loads a part with a bare `import()`, so the stand-in is an
// ES module whose default export is the component.
const stub = vi.hoisted(() => (part: string, props: string[]) => ({
  __esModule: true,
  default: {
    props,
    template: `<div data-test="part" data-part="${part}" :data-props="JSON.stringify($props)" :data-attrs="JSON.stringify($attrs)" />`,
    inheritAttrs: false,
  },
}))
vi.mock('~/components/Button/Product/AddToCart.vue', () => stub('default-cart', ['product', 'text', 'label']))
vi.mock('~/components/variants/webside/Button/Product/AddToCart.vue', () => stub('webside-cart', ['product', 'text', 'leadingIcon']))
vi.mock('~/components/Product/RestockAlert.vue', () => stub('default-restock', ['productId', 'productName', 'productImage']))
vi.mock('~/components/variants/webside/Product/NotifyMe.vue', () => stub('webside-restock', ['productId', 'kind']))

const NAME = 'Φορτιστής τσέπης'
const t = inlineT('app/components/Product/Spotlight.vue')

const product = (overrides: Parameters<typeof makeProductCard>[0] = {}) =>
  makeProductCard({ id: 7, slug: 'pocket-charger', translations: { el: { name: NAME } }, stock: 20, lowStockThreshold: 5, reviewAverage: 9, reviewCount: 3, ...overrides })

const mountSpotlight = (props: Record<string, unknown> = {}) =>
  mountSuspended(Spotlight, { route: false, props: { product: product(), ...props } })

async function part(wrapper: Awaited<ReturnType<typeof mountSpotlight>>) {
  await vi.waitFor(() => expect(wrapper.find('[data-test="part"]').exists()).toBe(true))
  const element = wrapper.get('[data-test="part"]')
  return {
    name: element.attributes('data-part'),
    props: JSON.parse(element.attributes('data-props')!) as Record<string, unknown>,
    // What the component does not declare: it would fall through onto the real one's root.
    attrs: JSON.parse(element.attributes('data-attrs')!) as Record<string, unknown>,
    /** Whether the part sits beside the price, in the price's row, rather than on a row of its own under it. */
    besidePrice: element.element.parentElement!.parentElement!.querySelector('h2') === null,
  }
}

describe('Product/Spotlight', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ cart: true, productReviews: true, productAlerts: true })
  })

  it('names the product as a link to its page, with its price', async () => {
    const wrapper = await mountSpotlight()

    const link = wrapper.get('h2 a')
    expect(link.text()).toBe(NAME)
    expect(link.attributes('href')).toBe('/products/7/pocket-charger')
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.n(product().finalPrice, 'currency'))
  })

  it('quotes the rating with reviews on, and leaves it out with them off', async () => {
    expect((await mountSpotlight()).find('[role="img"]').exists()).toBe(true)

    setTenantFeatures({ cart: true, productReviews: false, productAlerts: true })

    expect((await mountSpotlight()).find('[role="img"]').exists()).toBe(false)
  })

  it.each([
    [{ stock: 20 }, 'in_stock', undefined],
    [{ stock: 3 }, 'only_n_left', 3],
    [{ stock: 0 }, 'sold_out', undefined],
  ] as const)('says where the stock stands for %j', async (stock, key, count) => {
    const wrapper = await mountSpotlight({ product: product(stock) })

    expect(wrapper.text()).toContain(count === undefined ? t(key) : t(key, { count }, count))
  })

  describe('in the default design', () => {
    it('buys with the platform button, named for the product', async () => {
      const { name, props, attrs } = await part(await mountSpotlight())

      expect(name).toBe('default-cart')
      // Only the class that makes it a 44px target on a phone; no prop it does not declare.
      expect(attrs).toEqual({ class: 'min-h-11 sm:min-h-0' })
      expect(props).toMatchObject({ text: t('add_named', { name: NAME }), label: t('add_to_cart') })
      expect((props.product as { id: number }).id).toBe(7)
    })

    it('offers the platform restock alert for a sold-out product', async () => {
      const { name, props, attrs } = await part(await mountSpotlight({ product: product({ stock: 0 }) }))

      expect(name).toBe('default-restock')
      expect(attrs).toEqual({})
      expect(props).toMatchObject({ productId: 7, productName: NAME })
    })
  })

  // A design's restock control can be a block button, or (webside's, for a
  // signed-in shopper who already set one) an alert with its cancel action:
  // it gets a row of its own; the buy button sits beside the price.
  it('puts the buy button beside the price and the restock control on a row of its own', async () => {
    expect((await part(await mountSpotlight())).besidePrice).toBe(true)
    expect((await part(await mountSpotlight({ product: product({ stock: 0 }) }))).besidePrice).toBe(false)
  })

  // The classes are the contract, and the real check is the browser's
  // (nothing cut or past the card at 320, 360 and 390px in every design):
  // happy-dom lays nothing out. On a phone the card is a grid, the text and
  // the price beside the picture, and the way to buy (the button or the
  // restock control) the last row, across the whole card; the button fills it.
  it.each([
    ['the buy button', {}],
    ['the restock control', { stock: 0 }],
  ] as const)('gives %s a row of its own across the card on a phone, and fills it', async (_, stock) => {
    const wrapper = await mountSpotlight({ product: product(stock) })
    await part(wrapper)

    expect(wrapper.get('article').classes()).toEqual(expect.arrayContaining(['max-sm:grid', 'max-sm:grid-cols-[8.5rem_minmax(0,1fr)]']))
    const row = wrapper.get('[data-test="part"]').element.parentElement!
    expect(row.classList).toContain('max-sm:col-span-2')
    // Through the row, so a control whose root takes no class (webside's
    // restock alert is a modal) fills it too.
    expect([...row.classList]).toEqual(expect.arrayContaining(['max-sm:*:w-full', 'max-sm:*:justify-center']))
    // Every box between the card and that row steps aside on a phone, so the
    // row is the card's own grid item, not a cell of the text column.
    for (let box = row.parentElement!; box.tagName !== 'ARTICLE'; box = box.parentElement!) {
      expect(box.classList).toContain('max-sm:contents')
    }
  })

  describe('in the webside design', () => {
    beforeEach(() => {
      setTenant({ schemaName: 'webside' })
      setTenantFeatures({ cart: true, productReviews: true, productAlerts: true })
    })

    it('buys with webside\'s own button', async () => {
      const { name, props, attrs } = await part(await mountSpotlight())

      expect(name).toBe('webside-cart')
      // Only the class that makes it a 44px target on a phone; no prop it does not declare.
      expect(attrs).toEqual({ class: 'min-h-11 sm:min-h-0' })
      expect(props).toMatchObject({ text: t('add_to_cart') })
    })

    it('offers webside\'s own restock alert for a sold-out product', async () => {
      const { name, props, attrs } = await part(await mountSpotlight({ product: product({ stock: 0 }) }))

      expect(name).toBe('webside-restock')
      expect(attrs).toEqual({})
      expect(props).toEqual({ productId: 7, kind: 'restock' })
    })
  })

  it.each([
    ['the store has no cart', { cart: false, productReviews: true, productAlerts: true }, {}],
    ['the block turned the button off', { cart: true, productReviews: true, productAlerts: true }, { showAddToCart: false }],
  ])('offers no buy button when %s', async (_, features, props) => {
    setTenantFeatures(features)

    const wrapper = await mountSpotlight(props)
    await flushPromises()

    expect(wrapper.find('[data-test="part"]').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe(NAME)
  })

  it('offers nothing to buy a sold-out product with alerts off', async () => {
    setTenantFeatures({ cart: true, productReviews: true, productAlerts: false })

    const wrapper = await mountSpotlight({ product: product({ stock: 0 }) })
    await flushPromises()

    expect(wrapper.find('[data-test="part"]').exists()).toBe(false)
  })

  /**
   * The bold look (`look: 'bold'`, `Product/SpotlightBold`): one line of
   * rating (one star, the figure, the count in brackets) and stock in its
   * status colour, the price beside the store's button at every width, the
   * button's icon before its label and alone on a phone. The classes are the
   * contract; the browser is the real check.
   */
  describe('in its bold look', () => {
    beforeEach(() => {
      setTenant({ schemaName: 'webside' })
      setTenantFeatures({ cart: true, productReviews: true, productAlerts: true })
    })

    it('quotes the rating with one star and the count in brackets, beside the stock in words', async () => {
      const wrapper = await mountSpotlight({ look: 'bold' })

      const rating = wrapper.get('[role="img"]')
      expect(rating.text().replace(/\s+/g, ' ')).toBe('4,5 (3 κριτικές)')
      expect(rating.classes()).toContain('max-sm:hidden')
      expect(wrapper.find('.text-success').text()).toBe(t('in_stock'))
    })

    it('buys with the button of the store beside the price, its icon first, the icon alone on a phone', async () => {
      const { name, props, attrs, besidePrice } = await part(await mountSpotlight({ look: 'bold' }))

      expect(name).toBe('webside-cart')
      expect(props).toEqual({ product: expect.objectContaining({ id: 7 }), text: 'Στο καλάθι', leadingIcon: true })
      expect(String(attrs.class).split(/\s+/)).toEqual(expect.arrayContaining(['min-h-12', 'max-sm:size-12', 'max-sm:*:data-[slot=label]:sr-only']))
      expect(besidePrice).toBe(true)
    })
  })
})
