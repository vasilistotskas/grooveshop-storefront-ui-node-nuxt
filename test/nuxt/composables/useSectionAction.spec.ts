import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'
import { makeProductCard } from '~~/test/fixtures/product'
import { makePromotion } from '~~/test/fixtures/promotion'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * What a section's button does, on a plain `<button>`, as a design binds it.
 * Each action goes through the code the rest of the store runs: the cart
 * store, the favourites routes, the clipboard.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const session = vi.hoisted(() => ({
  loggedIn: { value: false },
  user: { value: null as { id: number } | null },
}))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: session.loggedIn,
  user: session.user,
  session: { value: null },
  ready: { value: true },
  fetch: vi.fn(),
  clear: vi.fn(),
}))

const toast = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), remove: vi.fn(), toasts: { value: [] } }))
mockNuxtImport('useToast', () => () => toast)

const copy = vi.hoisted(() => vi.fn(() => Promise.resolve()))
mockNuxtImport('useClipboard', () => () => ({ copy }))

const FAVOURITES_URL = '/api/products/favourites'
const FAVOURITES_BY_PRODUCTS_URL = '/api/products/favourites/favourites-by-products'

const product = (overrides = {}) => makeProductCard({ id: 5, stock: 3, active: true, ...overrides })
const addToCart = (overrides = {}): ReadyAction => ({ kind: 'addToCart', product: { status: 'ok', value: product(overrides) } })
const addToWishlist = (): ReadyAction => ({ kind: 'addToWishlist', product: { status: 'ok', value: product() } })
const copyCode = (code = 'SUMMER10'): ReadyAction => ({ kind: 'copyCode', promotion: { status: 'ok', value: { ...makePromotion(), code } } })

async function mountAction(action: ReadyAction | undefined, text = 'Δες το') {
  const current = ref(action)
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      const cta = reactive(useSectionAction(() => current.value, () => text))
      return () => h('button', { 'data-to': cta.to, ...cta.control }, cta.label)
    },
  }), { route: false })
  return { wrapper, current, button: () => wrapper.get('button') }
}

describe('useSectionAction', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ cart: true, catalogue: true, favourites: true, promotions: true })
    session.loggedIn.value = false
    session.user.value = null
    api.routes({ [FAVOURITES_BY_PRODUCTS_URL]: [] })
    useUserStore().favouriteProductIds = {}
  })

  describe('a link', () => {
    it('hands over its address and nothing else, so the button renders as it always did', async () => {
      const { button } = await mountAction({ kind: 'link', to: '/products' })

      expect(button().attributes()).toEqual({ 'data-to': '/products' })
      expect(button().text()).toBe('Δες το')
    })
  })

  describe('add to cart', () => {
    it('stays on the page and adds the product with the cart store', async () => {
      api.routes({ '/api/cart/items': { id: 1, product: 5, quantity: 1 } })
      const { button } = await mountAction(addToCart())

      expect(button().attributes('data-to')).toBeUndefined()
      await button().trigger('click')
      await flushPromises()

      expect(api.callsTo('/api/cart/items')[0]?.options).toMatchObject({ method: 'POST', body: { product: 5, quantity: 1 } })
    })

    it.each([
      { name: 'with no stock', overrides: { stock: 0 } },
      { name: 'that is inactive', overrides: { active: false } },
    ])('says so, and does not add, for a product $name', async ({ overrides }) => {
      const { button } = await mountAction(addToCart(overrides))

      expect(button().attributes('disabled')).toBeDefined()
      expect(button().text()).toBe(useNuxtApp().$i18n.t('section_action.unavailable'))
    })

    it('keeps the merchant\'s words on a product that can be added', async () => {
      const { button } = await mountAction(addToCart())

      expect(button().text()).toBe('Δες το')
    })
  })

  describe('add to wishlist', () => {
    it('tells a guest to sign in, with no request', async () => {
      const { button } = await mountAction(addToWishlist())
      await flushPromises()

      await button().trigger('click')
      await flushPromises()

      expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ title: useNuxtApp().$i18n.t('section_action.not_authenticated') }))
      expect(api.callsTo(FAVOURITES_URL)).toHaveLength(0)
      expect(api.callsTo(FAVOURITES_BY_PRODUCTS_URL)).toHaveLength(0)
    })

    it('saves the product for a signed-in shopper, and says it is saved', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 9 }
      api.routes({ [FAVOURITES_URL]: { id: 77, product: 5 }, [FAVOURITES_BY_PRODUCTS_URL]: [] })
      const { button } = await mountAction(addToWishlist())
      await flushPromises()

      expect(button().attributes('aria-pressed')).toBe('false')
      await button().trigger('click')
      await flushPromises()

      expect(api.callsTo(FAVOURITES_URL)[0]?.options).toMatchObject({ method: 'POST', body: { product: 5 } })
      expect(button().attributes('aria-pressed')).toBe('true')
    })

    it('asks whether it is saved after hydration, and only for a signed-in shopper', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 9 }
      api.routes({ [FAVOURITES_BY_PRODUCTS_URL]: [{ id: 77, productId: 5 }] })
      const { button } = await mountAction(addToWishlist())
      await flushPromises()

      expect(api.callsTo(FAVOURITES_BY_PRODUCTS_URL)[0]?.options).toMatchObject({ method: 'POST', body: { productIds: [5] } })
      expect(button().attributes('aria-pressed')).toBe('true')
    })

    it('still works when that question fails', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 9 }
      api.routes({ [FAVOURITES_BY_PRODUCTS_URL]: failWith(500) })
      const { button } = await mountAction(addToWishlist())
      await flushPromises()

      expect(button().attributes('aria-pressed')).toBe('false')
    })

    it('makes no such request for a button that does something else', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 9 }
      await mountAction(addToCart())
      await flushPromises()

      expect(api.callsTo(FAVOURITES_BY_PRODUCTS_URL)).toHaveLength(0)
    })
  })

  describe('copy a code', () => {
    it('copies the offer\'s code and says which', async () => {
      const { button } = await mountAction(copyCode())

      await button().trigger('click')
      await flushPromises()

      expect(copy).toHaveBeenCalledWith('SUMMER10')
      expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
        title: useNuxtApp().$i18n.t('section_action.copied', { code: 'SUMMER10' }),
      }))
    })
  })

  it('follows the action when the editor changes it', async () => {
    const { current, button } = await mountAction({ kind: 'link', to: '/products' })

    current.value = addToCart({ stock: 0 })
    await flushPromises()

    expect(button().attributes('data-to')).toBeUndefined()
    expect(button().attributes('disabled')).toBeDefined()
  })

  it('draws nothing to run with no action', async () => {
    const { button } = await mountAction(undefined)

    expect(button().attributes()).toEqual({})
  })
})
