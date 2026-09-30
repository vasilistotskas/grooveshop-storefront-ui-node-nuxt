import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CartButton from '~/components/Cart/CartButton.vue'
import WebsideCartButton from '~/components/variants/webside/Cart/CartButton.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { trees } from '~~/test/helpers/trees'

/**
 * The navbar cart icon: its count, its warning colour when a line has
 * outgrown the stock, and no stale count while the cart is loading.
 * The trees differ only in the `en:` block.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)

describe.each(trees(CartButton, WebsideCartButton))('$tree Cart/CartButton', ({ C }) => {
  beforeEach(async () => {
    // Also drops any request an earlier test left in flight.
    await useCartStore().cleanCartState()
    useCartStore().cart = makeCart()
  })

  const chip = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
    wrapper.findComponent({ name: 'UChip' })

  it.each([
    { totalItems: 7, shown: '7' },
    { totalItems: 99, shown: '99' },
    { totalItems: 100, shown: '99+' },
    { totalItems: 0, shown: '0' },
  ])('shows $shown for $totalItems items', async ({ totalItems, shown }) => {
    useCartStore().cart = makeCart({ totalItems })

    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.find('span[data-slot="base"]').text()).toBe(shown)
  })

  it('links to the cart under an accessible name', async () => {
    const wrapper = await mountSuspended(C, { route: false })
    const link = wrapper.find('a')

    expect(link.attributes('href')).toBe('/cart')
    expect(link.attributes('aria-label')).toBe('Καλάθι')
  })

  /**
   * Colour is the only signal the icon gives that checkout will refuse
   * the cart, so the chip's `color` prop is the contract here.
   */
  it.each([
    { case: 'a line exceeds the stock', item: { quantity: 3, product: { stock: 2 } }, color: 'warning' },
    { case: 'a product is sold out', item: { quantity: 1, product: { stock: 0 } }, color: 'warning' },
    { case: 'every line is in stock', item: { quantity: 2, product: { stock: 2 } }, color: 'success' },
  ])('is $color when $case', async ({ item, color }) => {
    useCartStore().cart = makeCart({ items: [item] })

    const wrapper = await mountSuspended(C, { route: false })

    expect(chip(wrapper).props('color')).toBe(color)
  })

  it('hides the count while a cart request is in flight', async () => {
    api.routes({ '/api/cart/items': () => new Promise(() => {}) })
    const wrapper = await mountSuspended(C, { route: false })
    expect(wrapper.find('span[data-slot="base"]').exists()).toBe(true)

    void useCartStore().createCartItem({ product: 2, quantity: 1 })
    await flushPromises()

    expect(wrapper.find('span[data-slot="base"]').exists()).toBe(false)
  })
})
