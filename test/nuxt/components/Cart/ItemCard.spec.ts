import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CartItemCard from '~/components/Cart/ItemCard.vue'
import WebsideCartItemCard from '~/components/variants/webside/Cart/ItemCard.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart, makeCartItem } from '~~/test/fixtures/cart'
import type { CartItemOverrides } from '~~/test/fixtures/cart'
import { trees } from '~~/test/helpers/trees'

/**
 * A cart line: its prices, a stepper capped at the stock, and removal
 * with an Undo that re-creates the line — the row id dies with the
 * DELETE, so Undo can only add the same product and quantity back. The
 * trees differ only in the `Webside` stepper prefix and the `en:` block.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const toast = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn(), update: vi.fn(), clear: vi.fn() }))

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => toast)

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
const serverError = () => { throw Object.assign(new Error('Server Error'), { statusCode: 500 }) }

const LINE: CartItemOverrides = {
  id: 7,
  quantity: 2,
  product: { id: 3, slug: 'kafetiera', price: 40, discountPercent: 10, stock: 4 },
}

/** The first toast's Undo action, as the toaster would run it. */
async function clickUndo() {
  const [options] = toast.add.mock.calls[0]!
  await options.actions[0].onClick(new Event('click'))
  await flushPromises()
}

describe.each(trees(CartItemCard, WebsideCartItemCard))('$tree Cart/ItemCard', ({ C }) => {
  beforeEach(async () => {
    await useCartStore().cleanCartState()
    useCartStore().cart = makeCart({ items: [LINE] })
    api.routes({ '/api/cart': makeCart({ items: [] }) })
  })

  const mount = () => mountSuspended(C, { route: false, props: { cartItem: makeCartItem(LINE) } })
  const removeButton = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    wrapper.find('button[title="Αφαίρεση από το καλάθι Προϊόν 3"]')

  it('links the name to the product and prices the line', async () => {
    const item = makeCartItem(LINE)
    const wrapper = await mount()
    const text = wrapper.text()

    expect(wrapper.find('h3 a').attributes('href')).toBe('/products/3/kafetiera')
    expect(wrapper.find('h3').text()).toBe('Προϊόν 3')
    expect(text).toContain(`Τιμή: ${money(item.finalPrice)}`)
    expect(text).toContain(`Έκπτωση ${money(item.discountValue)} / Ανά τεμάχιο`)
    expect(text).toContain(`Σύνολο: ${money(item.totalPrice)}`)
  })

  it('caps the quantity stepper at the product stock', async () => {
    const wrapper = await mount()

    expect(wrapper.find('[role="spinbutton"]').attributes('aria-valuemax')).toBe('4')
  })

  it('removes the line and offers to undo it', async () => {
    const wrapper = await mount()

    await removeButton(wrapper).trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/cart/items/7')).toEqual([
      { url: '/api/cart/items/7', options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(toast.add).toHaveBeenCalledTimes(1)
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Αφαιρέθηκε από το καλάθι',
      description: 'Το προϊόν "Προϊόν 3" αφαιρέθηκε.',
      duration: 8000,
      actions: [expect.objectContaining({ label: 'Αναίρεση' })],
    }))
  })

  it('puts the same product and quantity back on Undo', async () => {
    const wrapper = await mount()
    await removeButton(wrapper).trigger('click')
    await flushPromises()

    await clickUndo()

    expect(api.callsTo('/api/cart/items')).toEqual([
      { url: '/api/cart/items', options: expect.objectContaining({ method: 'POST', body: { product: 3, quantity: 2 } }) },
    ])
  })

  it('says so when Undo fails', async () => {
    const wrapper = await mount()
    await removeButton(wrapper).trigger('click')
    await flushPromises()
    api.routes({ '/api/cart': makeCart({ items: [] }), '/api/cart/items': serverError })

    await clickUndo()

    expect(toast.add).toHaveBeenLastCalledWith({ title: 'Η αναίρεση απέτυχε', color: 'error' })
  })

  it('reports a failed removal and offers no Undo', async () => {
    api.routes({ '/api/cart': makeCart({ items: [LINE] }), '/api/cart/items/7': serverError })
    const wrapper = await mount()

    await removeButton(wrapper).trigger('click')
    await flushPromises()

    expect(toast.add).toHaveBeenCalledTimes(1)
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Αποτυχία αφαίρεσης από το καλάθι',
      color: 'error',
    }))
    expect(toast.add.mock.calls[0]![0]).not.toHaveProperty('actions')
  })
})
