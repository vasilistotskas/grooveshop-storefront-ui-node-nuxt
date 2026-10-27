import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideAccountAreaButtonProductAddToCart from '~/components/variants/webside/AccountArea/Button/Product/AddToCart.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The webside account-area buy button confirms an add in ONE toast,
 * updated in place: a toast per tap stacked up over the page (owner
 * review, 2026-10-16). Its availability rules are the shared ones that
 * `test/nuxt/components/Button/Product/AddToCart.spec.ts` covers.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const toast = vi.hoisted(() => ({
  // The open toasts, as `useToast().toasts` holds them.
  toasts: { value: [] as Array<{ id: string | number }> },
  add: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  clear: vi.fn(),
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => toast)

describe('webside AccountArea/Button/Product/AddToCart', () => {
  beforeEach(async () => {
    setTenant()
    await useCartStore().cleanCartState()
    const cart = makeCart({ items: [] })
    useCartStore().cart = cart
    api.routes({ '/api/cart': cart })
    toast.toasts.value = []
    toast.add.mockImplementation((added: { id: string | number }) => {
      toast.toasts.value.push(added)
      return added
    })
  })

  it.each([
    { cart: true, iconOnly: false, buttons: 1 },
    { cart: false, iconOnly: false, buttons: 0 },
    { cart: true, iconOnly: true, buttons: 1 },
    { cart: false, iconOnly: true, buttons: 0 },
  ])('renders $buttons buttons when the cart is $cart (iconOnly: $iconOnly)', async ({ cart, iconOnly, buttons }) => {
    setTenantFeatures({ cart })

    const wrapper = await mountSuspended(WebsideAccountAreaButtonProductAddToCart, {
      route: false,
      props: { product: makeProduct({ id: 4 }), text: 'Αγορά', iconOnly },
    })

    expect(wrapper.findAll('button')).toHaveLength(buttons)
  })

  it('keeps one toast for quick adds, updated in place', async () => {
    const wrapper = await mountSuspended(WebsideAccountAreaButtonProductAddToCart, {
      route: false,
      props: { product: makeProduct({ id: 4 }), text: 'Αγορά' },
    })

    for (let tap = 0; tap < 3; tap++) {
      await wrapper.find('button').trigger('click')
      await flushPromises()
    }

    expect(toast.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      id: 'cart:added',
      color: 'success',
      title: 'Προστέθηκε στο καλάθι',
    }))
    expect(toast.update.mock.calls.map(([id]) => id)).toEqual(['cart:added', 'cart:added'])
  })
})
