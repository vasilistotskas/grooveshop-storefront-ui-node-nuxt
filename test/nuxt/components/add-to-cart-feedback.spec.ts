import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ButtonProductAddToCart from '~/components/Button/Product/AddToCart.vue'

/**
 * Buying must never fail in silence.
 *
 * Measured on staging: a click that did not reach the API produced no
 * toast, no console error and no cart change — the shopper had nothing
 * to go on but a badge that stayed at zero. The handler caught the
 * error into a `failed` flag and then returned without using it.
 *
 * The store's own `nonFieldErrors` (out of stock, over the limit) are
 * surfaced separately and take precedence; this covers everything
 * else, including a request that never left the browser.
 */
const added: unknown[] = []

mockNuxtImport('useToast', () => () => ({
  add: (options: unknown) => { added.push(options) },
  remove: () => {},
  update: () => {},
  clear: () => {},
}))

let createCartItem = vi.fn()

mockNuxtImport('useCartStore', () => () => ({
  createCartItem,
  updateCartItem: vi.fn(),
  getCartItemByProductId: () => undefined,
  error: ref(null),
  cart: ref(null),
}))

const product = {
  id: 1,
  name: 'Καλώδιο USB-C',
  active: true,
  stock: 10,
} as never

describe('add to cart', () => {
  beforeEach(() => {
    added.length = 0
  })

  it('tells the shopper when the add failed', async () => {
    createCartItem = vi.fn().mockRejectedValue(new Error('network down'))

    const wrapper = await mountSuspended(ButtonProductAddToCart, {
      props: { product, text: 'Αγορά' },
    })
    await wrapper.find('button').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(added, 'a failed add said nothing at all').toHaveLength(1)
    expect(added[0]).toMatchObject({ color: 'error' })

    wrapper.unmount()
  })

  it('confirms a successful one', async () => {
    createCartItem = vi.fn().mockResolvedValue({ id: 1 })

    const wrapper = await mountSuspended(ButtonProductAddToCart, {
      props: { product, text: 'Αγορά' },
    })
    await wrapper.find('button').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ color: 'success' })

    wrapper.unmount()
  })

  it('shows progress while the request is in flight', async () => {
    // `loading-auto` keeps the button busy for the life of the click
    // promise. Without it the only feedback is the toast at the end,
    // and a slow request looks exactly like a dead button — which is
    // the failure this whole file exists for.
    let release: () => void = () => {}
    createCartItem = vi.fn(() => new Promise<void>((resolve) => { release = () => resolve() }))

    const wrapper = await mountSuspended(ButtonProductAddToCart, {
      props: { product, text: 'Αγορά' },
    })
    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(
      wrapper.find('button').attributes('disabled'),
      'the button stayed idle while the request was in flight',
    ).toBeDefined()

    release()
    await new Promise(resolve => setTimeout(resolve, 0))
    wrapper.unmount()
  })
})
