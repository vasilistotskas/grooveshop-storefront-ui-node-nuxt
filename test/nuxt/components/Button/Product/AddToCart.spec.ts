import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ButtonProductAddToCart from '~/components/Button/Product/AddToCart.vue'
import WebsideButtonProductAddToCart from '~/components/variants/webside/Button/Product/AddToCart.vue'
import { useCartStore } from '~/stores/cart'
import type { Product } from '~~/shared/openapi/types.gen'
import { makeCart } from '~~/test/fixtures/cart'
import type { CartItemOverrides } from '~~/test/fixtures/cart'
import { makeProduct } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'

/**
 * The buy button: when it may be pressed at all (active, in stock, not
 * beyond the stock once the cart's own line is counted), whether it
 * adds a line or tops up the existing one, and what it tells the
 * shopper afterwards.
 *
 * Buying must never fail in silence — measured on staging, a click that
 * never reached the API produced no toast, no console error and no cart
 * change. The default tree toasts every failure; the frozen webside
 * copy predates that fix (`if (failed) return`), so that case and the
 * default's `loading-auto` busy state are default-only. Everything else
 * is one body over both trees.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const toast = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn(), update: vi.fn(), clear: vi.fn() }))

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => toast)

const UNAVAILABLE = 'Μή Διαθέσιμο'
const BUY = 'Αγορά'

const refusal = (data: Record<string, unknown>) => () => {
  throw Object.assign(new Error('Bad Request'), { statusCode: 400, data })
}

/** Put `lines` in the cart, and make `/api/cart` answer with it after a write. */
function cartHolds(lines: CartItemOverrides[] = []) {
  const cart = makeCart({ items: lines })
  useCartStore().cart = cart
  api.routes({ '/api/cart': cart })
}

describe.each(trees(ButtonProductAddToCart, WebsideButtonProductAddToCart))('$tree Button/Product/AddToCart', ({ tree, C }) => {
  beforeEach(async () => {
    await useCartStore().cleanCartState()
    cartHolds()
  })

  const mount = (props: { product: Product, quantity?: number, iconOnly?: boolean }) =>
    mountSuspended(C, { route: false, props: { text: BUY, ...props } })

  async function click(wrapper: VueWrapper) {
    await wrapper.find('button').trigger('click')
    await flushPromises()
  }

  describe('availability', () => {
    it.each([
      { case: 'an inactive product', product: { active: false }, quantity: 1, lines: [] },
      { case: 'a sold-out product', product: { stock: 0 }, quantity: 1, lines: [] },
      { case: 'more than the stock', product: { stock: 3 }, quantity: 4, lines: [] },
      { case: 'more than the stock once the cart line is counted', product: { stock: 3 }, quantity: 2, lines: [{ quantity: 2 }] },
    ])('refuses $case', async ({ product, quantity, lines }) => {
      cartHolds(lines.map(line => ({ ...line, product: { id: 1, stock: product.stock } })))

      const wrapper = await mount({ product: makeProduct(product), quantity })
      const button = wrapper.find('button')

      expect(button.attributes('disabled')).toBeDefined()
      expect(button.text()).toBe(UNAVAILABLE)
      expect(button.attributes('aria-label')).toBe(UNAVAILABLE)
    })

    it.each([
      { case: 'within the stock', product: { stock: 3 }, quantity: 3, lines: [] },
      { case: 'up to the stock with the cart line counted', product: { stock: 3 }, quantity: 1, lines: [{ quantity: 2 }] },
    ])('offers the product $case', async ({ product, quantity, lines }) => {
      cartHolds(lines.map(line => ({ ...line, product: { id: 1, stock: product.stock } })))

      const wrapper = await mount({ product: makeProduct(product), quantity })
      const button = wrapper.find('button')

      expect(button.attributes('disabled')).toBeUndefined()
      expect(button.text()).toBe(BUY)
    })

    it('names the icon-only button after its action or its unavailability', async () => {
      const available = await mount({ product: makeProduct(), iconOnly: true })
      const soldOut = await mount({ product: makeProduct({ stock: 0 }), iconOnly: true })

      expect(available.find('button').attributes('aria-label')).toBe(BUY)
      expect(soldOut.find('button').attributes('aria-label')).toBe(UNAVAILABLE)
    })
  })

  it('adds a new line with the chosen quantity and confirms it', async () => {
    const wrapper = await mount({ product: makeProduct({ id: 4 }), quantity: 2 })

    await click(wrapper)

    expect(api.callsTo('/api/cart/items')).toEqual([
      { url: '/api/cart/items', options: expect.objectContaining({ method: 'POST', body: { product: 4, quantity: 2 } }) },
    ])
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      color: 'success',
      title: 'Προστέθηκε στο καλάθι',
      description: 'Το προϊόν "Προϊόν 4" προστέθηκε στο καλάθι.',
    }))
  })

  it('tops up the line already in the cart instead of adding a second one', async () => {
    cartHolds([{ id: 12, quantity: 2, product: { id: 4 } }])
    const wrapper = await mount({ product: makeProduct({ id: 4 }), quantity: 3 })

    await click(wrapper)

    expect(api.callsTo('/api/cart/items')).toHaveLength(0)
    expect(api.callsTo('/api/cart/items/12')).toEqual([
      { url: '/api/cart/items/12', options: expect.objectContaining({ method: 'PUT', body: { quantity: 5 } }) },
    ])
  })

  it('adds a search hit as its master product', async () => {
    // A Meilisearch hit carries the product's id as `master`.
    const hit = Object.assign(makeProduct({ id: 900 }), { master: 4, name: 'Καφετιέρα' })
    const wrapper = await mount({ product: hit })

    await click(wrapper)

    expect(api.callsTo('/api/cart/items')[0]!.options.body).toEqual({ product: 4, quantity: 1 })
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Το προϊόν "Καφετιέρα" προστέθηκε στο καλάθι.',
    }))
  })

  it.each([
    { shape: 'the forwarded body', data: { nonFieldErrors: ['Εξαντλήθηκε', 'Όριο 2 τεμαχίων'] } },
    { shape: 'the legacy nested body', data: { data: { nonFieldErrors: ['Εξαντλήθηκε', 'Όριο 2 τεμαχίων'] } } },
  ])('shows each of Django\'s reasons from $shape, and nothing else', async ({ data }) => {
    api.routes({ '/api/cart': makeCart({ items: [] }), '/api/cart/items': refusal(data) })
    const wrapper = await mount({ product: makeProduct() })

    await click(wrapper)

    expect(toast.add.mock.calls).toEqual([
      [{ title: 'Εξαντλήθηκε', color: 'error' }],
      [{ title: 'Όριο 2 τεμαχίων', color: 'error' }],
    ])
  })

  it.runIf(tree === 'default')('tells the shopper when the add failed for any other reason', async () => {
    api.routes({ '/api/cart': makeCart({ items: [] }), '/api/cart/items': () => Promise.reject(new TypeError('Failed to fetch')) })
    const wrapper = await mount({ product: makeProduct() })

    await click(wrapper)

    expect(toast.add).toHaveBeenCalledTimes(1)
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      title: 'Δεν προστέθηκε στο καλάθι',
    }))
  })

  it.runIf(tree === 'default')('shows progress while the request is in flight', async () => {
    // `loading-auto` keeps the button busy for the life of the click
    // promise; without it a slow request looks exactly like a dead button.
    let land: (value: unknown) => void = () => {}
    api.routes({ '/api/cart': makeCart({ items: [] }), '/api/cart/items': () => new Promise((resolve) => { land = resolve }) })
    const wrapper = await mount({ product: makeProduct() })

    await click(wrapper)
    expect(wrapper.find('button').attributes('disabled'), 'the button stayed idle while the request was in flight').toBeDefined()

    land({})
    await flushPromises()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
