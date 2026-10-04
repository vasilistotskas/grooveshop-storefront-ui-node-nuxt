import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CartButton from '~/components/Cart/CartButton.vue'
import WebsideCartButton from '~/components/variants/webside/Cart/CartButton.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'

/**
 * The navbar cart icon: its count, its warning colour when a line has
 * outgrown the stock, and no stale count while the cart is loading.
 *
 * The default (Groove Volt) and the frozen webside button now differ:
 * the default hides the count on an empty cart, colours it with the
 * accent, and names the item count; webside keeps today's behaviour.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)

/** The default button's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { empty: 'Καλάθι', one: 'Καλάθι, 1 προϊόν', many: 'Καλάθι, 3 προϊόντα' }

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

const chip = (wrapper: Wrapper) => wrapper.findComponent({ name: 'UChip' })
const count = (wrapper: Wrapper) => wrapper.find('span[data-slot="base"]')

beforeEach(async () => {
  // Also drops any request an earlier test left in flight.
  await useCartStore().cleanCartState()
  useCartStore().cart = makeCart()
})

describe('default Cart/CartButton', () => {
  it.each([
    { totalItems: 7, shown: '7' },
    { totalItems: 99, shown: '99' },
    { totalItems: 100, shown: '99+' },
  ])('shows $shown for $totalItems items', async ({ totalItems, shown }) => {
    useCartStore().cart = makeCart({ totalItems })

    const wrapper = await mountSuspended(CartButton, { route: false })

    expect(count(wrapper).text()).toBe(shown)
  })

  it('shows no count on an empty cart', async () => {
    useCartStore().cart = makeCart({ totalItems: 0 })

    const wrapper = await mountSuspended(CartButton, { route: false })

    expect(count(wrapper).exists()).toBe(false)
  })

  it.each([
    { totalItems: 1, name: COPY.one },
    { totalItems: 3, name: COPY.many },
    { totalItems: 0, name: COPY.empty },
  ])('opens the cart drawer, named "$name" for $totalItems items', async ({ totalItems, name }) => {
    useCartStore().cart = makeCart({ totalItems })
    useCartDrawer().close()

    const wrapper = await mountSuspended(CartButton, { route: false })
    const button = wrapper.get('button')

    expect(button.attributes('aria-label')).toBe(name)
    expect(button.attributes('aria-haspopup')).toBe('dialog')
    await button.trigger('click')
    expect(useCartDrawer().open.value).toBe(true)
    // Opened from the header, not by an add: no "Added: …" banner.
    expect(useCartDrawer().added.value).toBeNull()
  })

  /**
   * Colour is the only signal the icon gives that checkout will refuse
   * the cart, so the chip's `color` prop is the contract here.
   */
  it.each([
    { case: 'a line exceeds the stock', item: { quantity: 3, product: { stock: 2 } }, color: 'warning' },
    { case: 'a product is sold out', item: { quantity: 1, product: { stock: 0 } }, color: 'warning' },
    { case: 'every line is in stock', item: { quantity: 2, product: { stock: 2 } }, color: 'secondary' },
  ])('is $color when $case', async ({ item, color }) => {
    useCartStore().cart = makeCart({ items: [item] })

    const wrapper = await mountSuspended(CartButton, { route: false })

    expect(chip(wrapper).props('color')).toBe(color)
  })

  it('hides the count while a cart request is in flight', async () => {
    useCartStore().cart = makeCart({ totalItems: 2 })
    api.routes({ '/api/cart/items': () => new Promise(() => {}) })
    const wrapper = await mountSuspended(CartButton, { route: false })
    expect(count(wrapper).exists()).toBe(true)

    void useCartStore().createCartItem({ product: 2, quantity: 1 })
    await flushPromises()

    expect(count(wrapper).exists()).toBe(false)
  })
})

describe('webside Cart/CartButton', () => {
  it.each([
    { totalItems: 7, shown: '7' },
    { totalItems: 99, shown: '99' },
    { totalItems: 100, shown: '99+' },
    { totalItems: 0, shown: '0' },
  ])('shows $shown for $totalItems items', async ({ totalItems, shown }) => {
    useCartStore().cart = makeCart({ totalItems })

    const wrapper = await mountSuspended(WebsideCartButton, { route: false })

    expect(count(wrapper).text()).toBe(shown)
  })

  it('links to the cart under an accessible name', async () => {
    const wrapper = await mountSuspended(WebsideCartButton, { route: false })
    const link = wrapper.find('a')

    expect(link.attributes('href')).toBe('/cart')
    expect(link.attributes('aria-label')).toBe('Καλάθι')
  })

  it.each([
    { case: 'a line exceeds the stock', item: { quantity: 3, product: { stock: 2 } }, color: 'warning' },
    { case: 'a product is sold out', item: { quantity: 1, product: { stock: 0 } }, color: 'warning' },
    { case: 'every line is in stock', item: { quantity: 2, product: { stock: 2 } }, color: 'success' },
  ])('is $color when $case', async ({ item, color }) => {
    useCartStore().cart = makeCart({ items: [item] })

    const wrapper = await mountSuspended(WebsideCartButton, { route: false })

    expect(chip(wrapper).props('color')).toBe(color)
  })

  it('hides the count while a cart request is in flight', async () => {
    api.routes({ '/api/cart/items': () => new Promise(() => {}) })
    const wrapper = await mountSuspended(WebsideCartButton, { route: false })
    expect(count(wrapper).exists()).toBe(true)

    void useCartStore().createCartItem({ product: 2, quantity: 1 })
    await flushPromises()

    expect(count(wrapper).exists()).toBe(false)
  })
})
