import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartStore } from '~/stores/cart'
import { makeCart, makeCartItem } from '~~/test/fixtures/cart'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

// The store captures the vendor composables at setup time, so these
// must be mocked before `useCartStore()` runs.
const pixels = vi.hoisted(() => ({
  meta: { trackAddToCart: vi.fn() },
  tiktok: { trackAddToCart: vi.fn() },
  openai: { trackItemsAdded: vi.fn() },
  googleAds: { trackAddToCart: vi.fn() },
  ga4: { trackAddToCart: vi.fn(), trackRemoveFromCart: vi.fn() },
}))
mockNuxtImport('useMetaPixel', () => () => pixels.meta)
mockNuxtImport('useTikTokPixel', () => () => pixels.tiktok)
mockNuxtImport('useOpenAIPixel', () => () => pixels.openai)
mockNuxtImport('useGoogleAds', () => () => pixels.googleAds)
mockNuxtImport('useGA4', () => () => pixels.ga4)

const { mockLog } = vi.hoisted(() => ({
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)

const IMPRESSION = '3f9c2b6e-1d5a-4c8b-9e7f-2a1b3c4d5e6f'

/**
 * Two lines at VAT 0 so a unit price is simply the product's `price`:
 * 2 × product 1 at 50 (10 in stock) and 1 × product 2 at 30, sold out.
 */
const twoLineCart = (overrides: { quantity1?: number, currency?: string } = {}) => makeCart({
  currency: overrides.currency ?? 'EUR',
  items: [
    { id: 1, quantity: overrides.quantity1 ?? 2, product: { id: 1, price: 50, vatPercent: 0, stock: 10 } },
    { id: 2, quantity: 1, product: { id: 2, price: 30, vatPercent: 0, stock: 0 } },
  ],
})

function deferred<T = unknown>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const t = (key: string, params?: Record<string, unknown>) => useNuxtApp().$i18n.t(key, params ?? {})

const allTrackers = () => [
  pixels.meta.trackAddToCart,
  pixels.tiktok.trackAddToCart,
  pixels.openai.trackItemsAdded,
  pixels.googleAds.trackAddToCart,
  pixels.ga4.trackAddToCart,
  pixels.ga4.trackRemoveFromCart,
]

describe('Cart Store', () => {
  let store: ReturnType<typeof useCartStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCartStore()
    window.sessionStorage.clear()
  })

  it('starts with no cart, nothing pending and no error', () => {
    expect(store.cart).toBeNull()
    expect(store.pending).toBe(false)
    expect(store.initialLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.getCartItems).toEqual([])
    expect(store.getCartTotalItems).toBe(0)
    expect(store.getCartItemIds).toEqual([])
  })

  it('reads the lines, the unit count and the line ids from the cart', () => {
    const cart = twoLineCart()
    store.cart = cart

    expect(store.getCartItems).toEqual(cart.items)
    expect(store.getCartTotalItems).toBe(3)
    expect(store.getCartItemIds).toEqual([1, 2])
  })

  it('finds a line by its id or by its product, and null for neither', () => {
    store.cart = twoLineCart()

    expect(store.getCartItemById(2)?.product.id).toBe(2)
    expect(store.getCartItemByProductId(1)?.id).toBe(1)
    expect(store.getCartItemById(999)).toBeNull()
    expect(store.getCartItemByProductId(999)).toBeNull()
  })

  describe('stock', () => {
    const over = makeCartItem({ id: 1, quantity: 10, product: { id: 1, stock: 5 } })
    const soldOut = makeCartItem({ id: 2, quantity: 1, product: { id: 2, stock: 0 } })
    const fine = makeCartItem({ id: 3, quantity: 5, product: { id: 3, stock: 20 } })

    beforeEach(() => {
      store.cart = makeCart({ items: [over, soldOut, fine] })
    })

    it('flags every line asking for more than is in stock, and the sold-out ones', () => {
      expect(store.getItemsWithStockIssues.map(item => item.id)).toEqual([1, 2])
      expect(store.getOutOfStockItems.map(item => item.id)).toEqual([2])
      expect(store.hasStockIssues).toBe(true)
    })

    it('reports no issue when every line is within stock', () => {
      store.cart = makeCart({ items: [fine] })

      expect(store.hasStockIssues).toBe(false)
    })

    it.each([
      ['a line over its stock', over, true],
      ['a sold-out line', soldOut, true],
      ['a line within stock', fine, false],
    ])('hasStockIssue: %s → %s', (_case, item, expected) => {
      expect(Boolean(store.hasStockIssue(item))).toBe(expected)
    })

    it('gives the stock a line can still have', () => {
      expect(store.getAvailableStock(over)).toBe(5)
      expect(store.getAvailableStock(soldOut)).toBe(0)
    })

    it('describes a sold-out line as an out-of-stock error', () => {
      expect(store.getStockStatusMessage(soldOut)).toEqual({
        type: 'out_of_stock',
        message: t('out_of_stock'),
        severity: 'error',
      })
    })

    it('describes a line over its stock as a warning naming both numbers', () => {
      expect(store.getStockStatusMessage(over)).toEqual({
        type: 'limited_stock',
        message: t('limited_stock', { stock: 5, quantity: 10 }),
        severity: 'warning',
        available: 5,
        requested: 10,
      })
    })

    it('has nothing to say about a line within stock', () => {
      expect(store.getStockStatusMessage(fine)).toBeNull()
    })

    it('reads a product with no stock figure as out of stock in every getter, as Django defaults it to 0', () => {
      // `stock` is optional in the contract; the getters used to disagree
      // on what its absence means — the message said sold out while the
      // issue lists and checks said all was well.
      const noFigure = makeCartItem({ id: 4, quantity: 1, product: { id: 4, stock: undefined } })
      store.cart = makeCart({ items: [noFigure] })

      expect(store.getAvailableStock(noFigure)).toBe(0)
      expect(store.getOutOfStockItems.map(item => item.id)).toEqual([4])
      expect(store.getItemsWithStockIssues.map(item => item.id)).toEqual([4])
      expect(store.hasStockIssues).toBe(true)
      expect(Boolean(store.hasStockIssue(noFigure))).toBe(true)
      expect(store.getStockStatusMessage(noFigure)?.type).toBe('out_of_stock')
    })
  })

  describe('pending', () => {
    it('is initial loading only while the first cart load is in flight', async () => {
      const load = deferred()
      api.routes({ '/api/cart': () => load.promise })

      const setup = store.setupCart()
      expect(store.pending).toBe(true)
      expect(store.initialLoading).toBe(true)

      load.resolve(twoLineCart())
      await setup
      expect(store.pending).toBe(false)
      expect(store.initialLoading).toBe(false)
    })

    it('does not count an item mutation on a loaded cart as initial loading', async () => {
      store.cart = twoLineCart()
      const put = deferred()
      api.routes({ '/api/cart/items/*': () => put.promise, '/api/cart': twoLineCart() })

      const update = store.updateCartItem(1, { quantity: 3 })
      expect(store.pending).toBe(true)
      expect(store.initialLoading).toBe(false)

      put.resolve({})
      await update
      expect(store.pending).toBe(false)
    })

    it('stays pending until every concurrent operation has settled', async () => {
      store.cart = twoLineCart()
      const put = deferred()
      const del = deferred()
      api.routes({
        '/api/cart/items/1': () => put.promise,
        '/api/cart/items/2': () => del.promise,
        '/api/cart': twoLineCart(),
      })

      const update = store.updateCartItem(1, { quantity: 3 })
      const remove = store.deleteCartItem(2)

      put.resolve({})
      await update
      expect(store.pending).toBe(true)

      del.resolve({})
      await remove
      expect(store.pending).toBe(false)
    })

    it('settles pending when an operation fails', async () => {
      api.routes({
        '/api/cart/items': () => {
          throw new Error('Failed to create')
        },
      })

      await expect(store.createCartItem({ product: 1, quantity: 1 })).rejects.toThrow('Failed to create')
      expect(store.pending).toBe(false)
    })
  })

  describe('setupCart', () => {
    it('loads the cart and clears a previous error', async () => {
      const cart = twoLineCart()
      store.error = { message: 'stale' }
      api.routes({ '/api/cart': cart })

      await store.setupCart()

      expect(api.callsTo('/api/cart')).toEqual([{ url: '/api/cart', options: { method: 'GET', headers: {} } }])
      expect(store.cart).toEqual(cart)
      expect(store.error).toBeNull()
    })

    it('stores no cart when there is none', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': null })

      await store.setupCart()

      expect(store.cart).toBeNull()
    })

    describe('a signed-in shopper', () => {
      // nuxt-auth-utils keeps the session in this state; a user in it is `loggedIn`.
      beforeEach(() => {
        useState('nuxt-session').value = { user: { id: 6 } }
      })
      afterEach(() => {
        useState('nuxt-session').value = null
      })

      it('reports a load that answered with no cart, since Django always has one for them', async () => {
        api.routes({ '/api/cart': null })

        await store.setupCart()

        expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({
          action: 'cart:setup:signed-in-without-cart',
          signedIn: true,
          page: window.location.pathname,
          cachedPage: false,
        }))
      })

      it('reports nothing when their cart loads', async () => {
        api.routes({ '/api/cart': twoLineCart() })

        await store.setupCart()

        expect(mockLog.error).not.toHaveBeenCalled()
      })

      it('says who and where on a failed load', async () => {
        api.routes({
          '/api/cart': () => {
            throw new Error('502')
          },
        })

        await store.setupCart()

        expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'cart:setup', signedIn: true }))
      })
    })

    it('reports nothing when a guest has no cart', async () => {
      api.routes({ '/api/cart': null })

      await store.setupCart()

      expect(mockLog.error).not.toHaveBeenCalled()
    })

    it('swallows a failed load, keeping what it had', async () => {
      const cart = twoLineCart()
      store.cart = cart
      api.routes({
        '/api/cart': () => {
          throw new Error('502')
        },
      })

      await expect(store.setupCart()).resolves.toBeUndefined()
      expect(store.cart).toEqual(cart)
      expect(store.pending).toBe(false)
    })
  })

  describe('refreshCart', () => {
    it('replaces the cart with the server\'s', async () => {
      const cart = twoLineCart({ quantity1: 4 })
      store.cart = twoLineCart()
      api.routes({ '/api/cart': cart })

      await store.refreshCart()

      expect(store.cart).toEqual(cart)
    })

    it.each([
      ['an empty response', () => null],
      ['a failure', () => { throw new Error('502') }],
    ])('keeps the previous cart on %s', async (_case, answer) => {
      const cart = twoLineCart()
      store.cart = cart
      api.routes({ '/api/cart': answer })

      await expect(store.refreshCart()).resolves.toBeUndefined()
      expect(store.cart).toEqual(cart)
    })
  })

  describe('createCartItem', () => {
    it('adds the line, then reloads the cart', async () => {
      const cart = twoLineCart()
      api.routes({ '/api/cart': cart })

      await store.createCartItem({ product: 1, quantity: 2 })

      expect(api.mock.calls).toEqual([
        ['/api/cart/items', { method: 'POST', headers: {}, body: { product: 1, quantity: 2 } }],
        ['/api/cart', { method: 'GET', headers: {} }],
      ])
      expect(store.cart).toEqual(cart)
      expect(store.error).toBeNull()
    })

    it('records the failure and rethrows it', async () => {
      const failure = new Error('Failed to create')
      api.routes({
        '/api/cart/items': () => {
          throw failure
        },
      })

      await expect(store.createCartItem({ product: 1, quantity: 2 })).rejects.toBe(failure)
      expect(store.error).toEqual(expect.objectContaining({ message: 'Failed to create' }))
    })

    it('carries the suggestion-strip impression the product was reached from', async () => {
      useRecommendationAttribution().remember(1, IMPRESSION)
      api.routes({ '/api/cart': twoLineCart() })

      await store.createCartItem({ product: 1, quantity: 1 })

      expect(api.callsTo('/api/cart/items')[0]!.options.body)
        .toEqual({ product: 1, quantity: 1, recommendationImpressionId: IMPRESSION })
    })

    it('carries the impression once — a second add of the product goes plain', async () => {
      useRecommendationAttribution().remember(1, IMPRESSION)
      api.routes({ '/api/cart': twoLineCart() })

      await store.createCartItem({ product: 1, quantity: 1 })
      await store.createCartItem({ product: 1, quantity: 1 })

      expect(api.callsTo('/api/cart/items').map(call => call.options.body)).toEqual([
        { product: 1, quantity: 1, recommendationImpressionId: IMPRESSION },
        { product: 1, quantity: 1 },
      ])
    })

    it('does not carry an impression remembered for another product', async () => {
      useRecommendationAttribution().remember(2, IMPRESSION)
      api.routes({ '/api/cart': twoLineCart() })

      await store.createCartItem({ product: 1, quantity: 1 })

      expect(api.callsTo('/api/cart/items')[0]!.options.body).toEqual({ product: 1, quantity: 1 })
    })
  })

  describe('updateCartItem', () => {
    it('sets the line quantity, then reloads the cart', async () => {
      store.cart = twoLineCart()
      const updated = twoLineCart({ quantity1: 5 })
      api.routes({ '/api/cart': updated })

      await store.updateCartItem(1, { quantity: 5 })

      expect(api.callsTo('/api/cart/items/1')).toEqual([
        { url: '/api/cart/items/1', options: { method: 'PUT', headers: {}, body: { quantity: 5 } } },
      ])
      expect(store.cart).toEqual(updated)
    })

    it('carries the impression of the line\'s product on a quantity bump', async () => {
      store.cart = twoLineCart()
      useRecommendationAttribution().remember(1, IMPRESSION)
      api.routes({ '/api/cart': twoLineCart({ quantity1: 3 }) })

      await store.updateCartItem(1, { quantity: 3 })

      expect(api.callsTo('/api/cart/items/1')[0]!.options.body)
        .toEqual({ quantity: 3, recommendationImpressionId: IMPRESSION })
    })

    it('records the failure and rethrows it', async () => {
      store.cart = twoLineCart()
      api.routes({
        '/api/cart/items/*': () => {
          throw new Error('Failed to update')
        },
      })

      await expect(store.updateCartItem(1, { quantity: 5 })).rejects.toThrow('Failed to update')
      expect(store.error).toEqual(expect.objectContaining({ message: 'Failed to update' }))
    })
  })

  describe('deleteCartItem', () => {
    it('removes the line, then reloads the cart', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': makeCart({ items: [] }) })

      await store.deleteCartItem(1)

      expect(api.callsTo('/api/cart/items/1')).toEqual([
        { url: '/api/cart/items/1', options: { method: 'DELETE', headers: {} } },
      ])
      expect(store.getCartItems).toEqual([])
      expect(store.error).toBeNull()
    })

    it('records the failure and rethrows it', async () => {
      api.routes({
        '/api/cart/items/*': () => {
          throw new Error('Failed to delete')
        },
      })

      await expect(store.deleteCartItem(1)).rejects.toThrow('Failed to delete')
      expect(store.error).toEqual(expect.objectContaining({ message: 'Failed to delete' }))
    })
  })

  describe('clearCart', () => {
    it('deletes the cart, forgets it, and reports each line as removed', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': null })

      await store.clearCart()

      expect(api.callsTo('/api/cart')).toEqual([
        { url: '/api/cart', options: { method: 'DELETE', headers: {} } },
      ])
      expect(store.cart).toBeNull()
      expect(store.error).toBeNull()
      expect(pixels.ga4.trackRemoveFromCart.mock.calls.map(([event]) => event.items)).toEqual([
        [{ item_id: '1', quantity: 2, price: 50 }],
        [{ item_id: '2', quantity: 1, price: 30 }],
      ])
    })

    it('keeps the cart, records the failure and rethrows it', async () => {
      store.cart = twoLineCart()
      api.routes({
        '/api/cart': () => {
          throw new Error('Failed to empty')
        },
      })

      await expect(store.clearCart()).rejects.toThrow('Failed to empty')
      expect(store.getCartItems).toHaveLength(2)
      expect(store.error).toEqual(expect.objectContaining({ message: 'Failed to empty' }))
      expect(pixels.ga4.trackRemoveFromCart).not.toHaveBeenCalled()
    })
  })

  describe('cleanCartState', () => {
    it.each([
      ['the server cleared the session', () => ({})],
      ['clearing the session failed', () => { throw new Error('500') }],
    ])('resets the cart when %s', async (_case, answer) => {
      store.cart = twoLineCart()
      store.error = { message: 'stale' }
      api.routes({ '/api/cart/clear-session': answer })

      await expect(store.cleanCartState()).resolves.toBeUndefined()

      expect(api.callsTo('/api/cart/clear-session')[0]!.options).toEqual({ method: 'POST' })
      expect(store.cart).toBeNull()
      expect(store.pending).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('analytics', () => {
    it('fires add_to_cart on every vendor, valued from the refreshed cart', async () => {
      api.routes({ '/api/cart': twoLineCart() })

      await store.createCartItem({ product: 1, quantity: 2 })

      expect(pixels.meta.trackAddToCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 100,
        contentIds: ['1'],
        contents: [{ id: '1', quantity: 2, itemPrice: 50 }],
        contentType: 'product',
      })
      expect(pixels.tiktok.trackAddToCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 100,
        contentType: 'product',
        contents: [{ contentId: '1', quantity: 2, price: 50 }],
      })
      expect(pixels.openai.trackItemsAdded).toHaveBeenCalledWith({
        currency: 'EUR',
        amount: 100,
        contents: [{ id: '1', contentType: 'product', quantity: 2 }],
      })
      expect(pixels.googleAds.trackAddToCart).toHaveBeenCalledWith({ currency: 'EUR', value: 100 })
      expect(pixels.ga4.trackAddToCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 100,
        items: [{ item_id: '1', quantity: 2, price: 50 }],
      })
      expect(pixels.ga4.trackRemoveFromCart).not.toHaveBeenCalled()
    })

    it('values an add at the product\'s final (VAT-in) price, not its net price', async () => {
      // Net 50 at 24% VAT: finalPrice 62.
      api.routes({ '/api/cart': makeCart({ items: [{ id: 1, product: { id: 1, price: 50, vatPercent: 24 } }] }) })

      await store.createCartItem({ product: 1, quantity: 1 })

      expect(pixels.googleAds.trackAddToCart).toHaveBeenCalledWith({ currency: 'EUR', value: 62 })
    })

    it('counts the refreshed line\'s quantity when the add named none', async () => {
      api.routes({ '/api/cart': twoLineCart({ quantity1: 3 }) })

      await store.createCartItem({ product: 1 } as CartItemCreateRequest)

      expect(pixels.googleAds.trackAddToCart).toHaveBeenCalledWith({ currency: 'EUR', value: 150 })
    })

    it('fires nothing when the added product is missing from the refreshed cart', async () => {
      api.routes({ '/api/cart': twoLineCart() })

      await store.createCartItem({ product: 999, quantity: 1 })

      for (const track of allTrackers()) expect(track).not.toHaveBeenCalled()
    })

    it('fires add_to_cart for the increase only when an update raises the quantity', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': twoLineCart({ quantity1: 5 }) })

      await store.updateCartItem(1, { quantity: 5 })

      // 2 → 5 is three units added.
      expect(pixels.ga4.trackAddToCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 150,
        items: [{ item_id: '1', quantity: 3, price: 50 }],
      })
      expect(pixels.meta.trackAddToCart).toHaveBeenCalledOnce()
      expect(pixels.ga4.trackRemoveFromCart).not.toHaveBeenCalled()
    })

    it('fires only GA4\'s remove_from_cart when an update lowers the quantity', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': twoLineCart({ quantity1: 1 }) })

      await store.updateCartItem(1, { quantity: 1 })

      expect(pixels.ga4.trackRemoveFromCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 50,
        items: [{ item_id: '1', quantity: 1, price: 50 }],
      })
      expect(pixels.meta.trackAddToCart).not.toHaveBeenCalled()
      expect(pixels.ga4.trackAddToCart).not.toHaveBeenCalled()
    })

    it('fires nothing when an update keeps the quantity', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': twoLineCart() })

      await store.updateCartItem(1, { quantity: 2 })

      for (const track of allTrackers()) expect(track).not.toHaveBeenCalled()
    })

    it('counts a line the cart did not hold yet from zero, with no impression', async () => {
      // The local cart is stale: line 5 exists only on the server.
      store.cart = twoLineCart()
      useRecommendationAttribution().remember(5, IMPRESSION)
      api.routes({
        '/api/cart': makeCart({ items: [{ id: 5, quantity: 3, product: { id: 5, price: 10, vatPercent: 0 } }] }),
      })

      await store.updateCartItem(5, { quantity: 3 })

      expect(api.callsTo('/api/cart/items/5')[0]!.options.body).toEqual({ quantity: 3 })
      expect(pixels.ga4.trackAddToCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 30,
        items: [{ item_id: '5', quantity: 3, price: 10 }],
      })
    })

    it('fires remove_from_cart for the whole line when it is deleted', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': makeCart({ items: [] }) })

      await store.deleteCartItem(1)

      expect(pixels.ga4.trackRemoveFromCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 100,
        items: [{ item_id: '1', quantity: 2, price: 50 }],
      })
      expect(pixels.meta.trackAddToCart).not.toHaveBeenCalled()
    })

    it('fires nothing when deleting a line the cart does not hold', async () => {
      store.cart = twoLineCart()
      api.routes({ '/api/cart': twoLineCart() })

      await store.deleteCartItem(999)

      for (const track of allTrackers()) expect(track).not.toHaveBeenCalled()
    })

    it('tracks a server-side change (reorder) through trackCartQuantityChange', () => {
      store.cart = twoLineCart()

      store.trackCartQuantityChange(1, 3, 50)

      expect(pixels.meta.trackAddToCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 150,
        contentIds: ['1'],
        contents: [{ id: '1', quantity: 3, itemPrice: 50 }],
        contentType: 'product',
      })
    })

    it('ignores a zero change', () => {
      store.trackCartQuantityChange(1, 0, 50)

      for (const track of allTrackers()) expect(track).not.toHaveBeenCalled()
    })

    it.each([
      ['the cart\'s own currency', 'USD', 'USD'],
      ['the store currency when there is no cart', null, 'CHF'],
    ])('reports %s', (_case, cartCurrency, expected) => {
      setTenant({ defaultCurrency: 'CHF' })
      store.cart = cartCurrency ? twoLineCart({ currency: cartCurrency }) : null

      store.trackCartQuantityChange(1, 1, 50)

      expect(pixels.googleAds.trackAddToCart).toHaveBeenCalledWith({ currency: expected, value: 50 })
    })

    it('never lets a failing pixel break the cart', async () => {
      pixels.meta.trackAddToCart.mockImplementation(() => {
        throw new Error('fbq blocked')
      })
      api.routes({ '/api/cart': twoLineCart() })

      await expect(store.createCartItem({ product: 1, quantity: 1 })).resolves.toBeUndefined()
      expect(store.error).toBeNull()
      expect(() => store.trackCartQuantityChange(1, 1, 50)).not.toThrow()
    })
  })
})
