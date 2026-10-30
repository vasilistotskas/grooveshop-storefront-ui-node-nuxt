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
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The buy button: when it may be pressed at all (active, in stock, not
 * beyond the stock once the cart's own line is counted), whether it
 * adds a line or tops up the existing one, and what it tells the
 * shopper afterwards.
 *
 * Buying must never fail in silence — measured on staging, a click that
 * never reached the API produced no toast, no console error and no cart
 * change. And it answers at once: the "Adding…" toast opens on the click,
 * before the request, and the answer replaces it in place. Everything is
 * one body over both trees but how a successful add is announced: the
 * default tree opens the cart drawer with the line on a desktop and, on a
 * phone, toasts the product with "View" (which opens the drawer); webside
 * keeps its "added" toast.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
// The open toasts, as `useToast().toasts` holds them: the component
// updates its toast in place when it is already open.
const toast = await vi.hoisted(async () => (await import('~~/test/helpers/toast')).createToastMock())

const viewport = vi.hoisted(() => ({ desktop: true }))

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => toast)
mockNuxtImport('useMediaQuery', () => () => ref(viewport.desktop))
mockNuxtImport('useMediaStreamImage', () => () => (path: string) => `https://media.test/${path}`)

const UNAVAILABLE = 'Μή Διαθέσιμο'
const BUY = 'Αγορά'

/** Put `lines` in the cart, and make a write answer with it, as Django answers with the cart. */
function cartHolds(lines: CartItemOverrides[] = []) {
  const cart = makeCart({ items: lines })
  useCartStore().cart = cart
  api.routes({ '/api/cart': cart, '/api/cart/items': cart, '/api/cart/items/*': cart })
}

describe.each(trees(ButtonProductAddToCart, WebsideButtonProductAddToCart))('$tree Button/Product/AddToCart', ({ tree, C }) => {
  beforeEach(async () => {
    setTenant()
    await useCartStore().cleanCartState()
    cartHolds()
    viewport.desktop = true
    useCartDrawer().close()
    toast.toasts.value = []
    useState('cart-added-toast-count').value = 0
    window.sessionStorage.clear()
  })

  const mount = (props: { product: Product, quantity?: number, iconOnly?: boolean }) =>
    mountSuspended(C, { route: false, props: { text: BUY, ...props } })

  async function click(wrapper: VueWrapper) {
    await wrapper.find('button').trigger('click')
    await flushPromises()
  }

  /** The one toast the buttons share, as it shows now. */
  const addToast = () => toast.shown('cart:add')

  // A browse-only store takes no orders, so nothing it draws is a way to
  // buy: every add-to-cart button routes through this component.
  describe('a store without a cart', () => {
    it.each([{ iconOnly: false }, { iconOnly: true }])('renders no button (iconOnly: $iconOnly)', async ({ iconOnly }) => {
      setTenantFeatures({ cart: false })

      const wrapper = await mount({ product: makeProduct(), iconOnly })

      expect(wrapper.find('button').exists()).toBe(false)
    })

    it.each([{ iconOnly: false }, { iconOnly: true }])('renders the button when the store has a cart (iconOnly: $iconOnly)', async ({ iconOnly }) => {
      const wrapper = await mount({ product: makeProduct(), iconOnly })

      expect(wrapper.find('button').exists()).toBe(true)
    })
  })

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

  it('adds a new line with the chosen quantity', async () => {
    const wrapper = await mount({ product: makeProduct({ id: 4 }), quantity: 2 })

    await click(wrapper)

    expect(api.callsTo('/api/cart/items')).toEqual([
      { url: '/api/cart/items', options: expect.objectContaining({ method: 'POST', body: { product: 4, quantity: 2 } }) },
    ])
  })

  // The tab's first-touch source (the one the order carries) rides on the
  // add, so Django records it on the cart; with nothing captured the body
  // above is exactly the line.
  it('sends the captured order attribution with the add', async () => {
    window.sessionStorage.setItem('order-attribution', JSON.stringify({ utmSource: 'newsletter', clickIds: ['gclid'], landingPath: '/p/4' }))
    const wrapper = await mount({ product: makeProduct({ id: 4 }), quantity: 2 })

    await click(wrapper)

    expect(api.callsTo('/api/cart/items')).toEqual([
      {
        url: '/api/cart/items',
        options: expect.objectContaining({
          method: 'POST',
          body: { product: 4, quantity: 2, attribution: { utmSource: 'newsletter', clickIds: ['gclid'], landingPath: '/p/4' } },
        }),
      },
    ])
  })

  it.runIf(tree === 'webside')('confirms the add in a toast', async () => {
    const wrapper = await mount({ product: makeProduct({ id: 4 }), quantity: 2 })

    await click(wrapper)

    expect(addToast()).toMatchObject({
      color: 'success',
      title: 'Προστέθηκε στο καλάθι',
      description: 'Το προϊόν "Προϊόν 4" προστέθηκε στο καλάθι.',
      duration: undefined,
      progress: true,
      ui: undefined,
    })
  })

  it.runIf(tree === 'webside')('keeps one toast for quick adds, updated in place', async () => {
    const wrapper = await mount({ product: makeProduct({ id: 4 }) })

    await click(wrapper)
    await click(wrapper)
    await click(wrapper)

    // One toast, opened by the first click's "Adding…" and updated in place
    // by every answer and by the next two clicks' "Adding…".
    expect(toast.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'cart:add' }))
    expect(toast.update.mock.calls.map(([id]) => id)).toEqual(Array(5).fill('cart:add'))
    expect(toast.toasts.value).toHaveLength(1)
  })

  it('says "Adding…" at once, before the request answers, and replaces it with the answer', async () => {
    viewport.desktop = false
    let land: (value: unknown) => void = () => {}
    api.routes({
      '/api/cart/items': () => new Promise((resolve) => {
        land = resolve
      }),
    })
    const wrapper = await mount({ product: makeProduct({ id: 4 }) })

    await click(wrapper)

    // The theme's loading icon, spinning; no countdown and no timeout.
    expect(addToast()).toMatchObject({
      title: 'Προσθήκη στο καλάθι…',
      description: 'Προϊόν 4',
      icon: useAppConfig().ui.icons.loading,
      duration: 0,
      progress: false,
      ui: { icon: expect.stringContaining('animate-spin') },
    })

    land(makeCart({ items: [{ id: 1, quantity: 1, product: { id: 4 } }] }))
    await flushPromises()

    expect(addToast()).not.toMatchObject({ duration: 0 })
    expect(addToast()).toMatchObject({ progress: true, ui: undefined })
  })

  it.runIf(tree === 'default')('opens the cart drawer with the added line on a desktop, without a toast', async () => {
    const wrapper = await mount({ product: makeProduct({ id: 4 }) })

    await click(wrapper)

    const drawer = useCartDrawer()
    expect(drawer.open.value).toBe(true)
    expect(drawer.added.value).toBe('Προϊόν 4')
    // The drawer is the confirmation: the "Adding…" toast is taken down.
    expect(toast.remove).toHaveBeenCalledWith('cart:add')
    expect(addToast()).toBeUndefined()
  })

  it.runIf(tree === 'default')('toasts the added product with its photograph on a phone, and "View" opens the drawer', async () => {
    viewport.desktop = false
    const wrapper = await mount({ product: makeProduct({ id: 4, mainImagePath: 'media/uploads/products/cable.jpg' }) })

    await click(wrapper)

    const drawer = useCartDrawer()
    expect(drawer.open.value).toBe(false)
    expect(addToast()).toMatchObject({
      title: 'Προστέθηκε στο καλάθι',
      description: 'Προϊόν 4',
      avatar: { alt: 'Προϊόν 4', src: 'https://media.test/media/uploads/products/cable.jpg' },
      icon: undefined,
      actions: [expect.objectContaining({ label: 'Προβολή' })],
    })

    ;(addToast()!.actions as Array<{ onClick: () => void }>)[0]!.onClick()

    expect(drawer.open.value).toBe(true)
    expect(drawer.added.value).toBe('Προϊόν 4')
  })

  it.runIf(tree === 'default')('keeps one toast for quick adds, counting them, and starts over once it closes', async () => {
    viewport.desktop = false
    const wrapper = await mount({ product: makeProduct({ id: 4, mainImagePath: '' }) })

    await click(wrapper)
    await click(wrapper)
    await click(wrapper)

    expect(toast.add).toHaveBeenCalledOnce()
    // Each click: "Adding…", then the count of the adds while it is open.
    expect(toast.update.mock.calls.map(([, content]) => content.title)).toEqual([
      'Προστέθηκε στο καλάθι',
      'Προσθήκη στο καλάθι…',
      'Προστέθηκαν 2 προϊόντα στο καλάθι',
      'Προσθήκη στο καλάθι…',
      'Προστέθηκαν 3 προϊόντα στο καλάθι',
    ])

    // Closed (timer or dismiss): the toast leaves the list and the count resets.
    ;(addToast()!['onUpdate:open'] as (open: boolean) => void)(false)
    toast.toasts.value = []
    await click(wrapper)

    expect(toast.add).toHaveBeenCalledTimes(2)
    expect(addToast()).toMatchObject({ title: 'Προστέθηκε στο καλάθι' })
  })

  it.runIf(tree === 'default')('toasts a product without a photograph with a check instead', async () => {
    viewport.desktop = false
    const wrapper = await mount({ product: makeProduct({ id: 4, mainImagePath: '' }) })

    await click(wrapper)

    expect(addToast()).toMatchObject({ avatar: undefined, icon: 'i-lucide-circle-check' })
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
  })

  it('shows Django\'s reasons in one toast, and nothing else', async () => {
    api.routes({
      '/api/cart': makeCart({ items: [] }),
      '/api/cart/items': failWith(400, { nonFieldErrors: ['Εξαντλήθηκε', 'Όριο 2 τεμαχίων'] }),
    })
    const wrapper = await mount({ product: makeProduct() })

    await click(wrapper)

    // The failure takes the "Adding…" toast's place, whole.
    expect(toast.toasts.value).toHaveLength(1)
    expect(addToast()).toMatchObject({
      title: 'Δεν προστέθηκε στο καλάθι',
      description: 'Εξαντλήθηκε Όριο 2 τεμαχίων',
      color: 'error',
      icon: undefined,
      duration: undefined,
      progress: true,
      ui: undefined,
    })
  })

  it('tells the shopper when the add failed for any other reason', async () => {
    api.routes({ '/api/cart': makeCart({ items: [] }), '/api/cart/items': () => Promise.reject(new TypeError('Failed to fetch')) })
    const wrapper = await mount({ product: makeProduct() })

    await click(wrapper)

    expect(toast.toasts.value).toHaveLength(1)
    expect(addToast()).toMatchObject({
      color: 'error',
      title: 'Δεν προστέθηκε στο καλάθι',
    })
  })

  it('shows progress while the request is in flight', async () => {
    // `loading-auto` keeps the button busy for the life of the click
    // promise; without it a slow request looks exactly like a dead button.
    let land: (value: unknown) => void = () => {}
    api.routes({
      '/api/cart': makeCart({ items: [] }),
      '/api/cart/items': () => new Promise((resolve) => {
        land = resolve
      }),
    })
    const wrapper = await mount({ product: makeProduct() })

    await click(wrapper)
    expect(wrapper.find('button').attributes('disabled'), 'the button stayed idle while the request was in flight').toBeDefined()

    land({})
    await flushPromises()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
