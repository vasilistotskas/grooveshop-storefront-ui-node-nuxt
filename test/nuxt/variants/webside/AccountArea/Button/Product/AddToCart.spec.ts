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
const toast = await vi.hoisted(async () => (await import('~~/test/helpers/toast')).createToastMock())

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => toast)

describe('webside AccountArea/Button/Product/AddToCart', () => {
  beforeEach(async () => {
    setTenant()
    await useCartStore().cleanCartState()
    const cart = makeCart({ items: [] })
    useCartStore().cart = cart
    api.routes({ '/api/cart': cart, '/api/cart/items': cart })
    toast.toasts.value = []
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

    // Opened by the first tap's "Adding…", then updated in place by every
    // answer and by the next two taps' "Adding…".
    expect(toast.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'cart:add' }))
    expect(toast.update.mock.calls.map(([id]) => id)).toEqual(Array(5).fill('cart:add'))
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.shown('cart:add')).toMatchObject({
      color: 'success',
      title: 'Προστέθηκε στο καλάθι',
      duration: undefined,
      progress: true,
    })
  })

  it('says "Adding…" at once, before the request answers', async () => {
    let land: (value: unknown) => void = () => {}
    api.routes({
      '/api/cart/items': () => new Promise((resolve) => {
        land = resolve
      }),
    })
    const wrapper = await mountSuspended(WebsideAccountAreaButtonProductAddToCart, {
      route: false,
      props: { product: makeProduct({ id: 4 }), text: 'Αγορά' },
    })

    await wrapper.find('button').trigger('click')

    expect(toast.shown('cart:add')).toMatchObject({
      title: 'Προσθήκη στο καλάθι…',
      icon: useAppConfig().ui.icons.loading,
      duration: 0,
      progress: false,
    })

    land(makeCart({ items: [{ id: 1, quantity: 1, product: { id: 4 } }] }))
    await flushPromises()

    expect(toast.shown('cart:add')).toMatchObject({ title: 'Προστέθηκε στο καλάθι', progress: true })
  })
})
