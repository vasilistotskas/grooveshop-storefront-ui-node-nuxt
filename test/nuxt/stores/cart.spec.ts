import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '~/stores/cart'

const mockI18n = {
  t: vi.fn((key: string, params?: any) => {
    if (key === 'common.out_of_stock') return 'Out of stock'
    if (key === 'common.limited_stock') return `Limited stock: ${params?.stock} available, ${params?.quantity} requested`
    return key
  }),
}

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useNuxtApp: () => ({
      $i18n: mockI18n,
    }),
    useRequestHeaders: () => ({}),
  }
})

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Cart Store', () => {
  let store: ReturnType<typeof useCartStore>

  const mockCartData = {
    id: 1,
    user: 1,
    totalItems: 2,
    totalPrice: 100.00,
    items: [
      {
        id: 1,
        cartId: 1,
        product: {
          id: 1,
          name: 'Test Product 1',
          slug: 'test-product-1',
          price: '50.00',
          stock: 10,
        },
        quantity: 2,
        totalPrice: 100.00,
      },
      {
        id: 2,
        cartId: 1,
        product: {
          id: 2,
          name: 'Test Product 2',
          slug: 'test-product-2',
          price: '30.00',
          stock: 0,
        },
        quantity: 1,
        totalPrice: 30.00,
      },
    ],
  } as unknown as CartDetail

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCartStore()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have null cart initially', () => {
      expect(store.cart).toBeNull()
    })

    it('should not be pending initially', () => {
      expect(store.pending).toBe(false)
    })

    it('should have no error initially', () => {
      expect(store.error).toBeNull()
    })
  })

  describe('Computed Properties', () => {
    beforeEach(() => {
      store.cart = mockCartData
    })

    it('should return cart items', () => {
      expect(store.getCartItems).toEqual(mockCartData.items)
      expect(store.getCartItems.length).toBe(2)
    })

    it('should return total items count', () => {
      expect(store.getCartTotalItems).toBe(2)
    })

    it('should return cart item IDs', () => {
      expect(store.getCartItemIds).toEqual([1, 2])
    })

    it('should return empty array when cart is null', () => {
      store.cart = null
      expect(store.getCartItems).toEqual([])
      expect(store.getCartTotalItems).toBe(0)
      expect(store.getCartItemIds).toEqual([])
    })
  })

  describe('Stock Management', () => {
    beforeEach(() => {
      store.cart = {
        ...mockCartData,
        items: [
          {
            id: 1,
            cartId: 1,
            product: { id: 1, stock: 5 },
            quantity: 10, // More than stock
            totalPrice: 100.00,
          },
          {
            id: 2,
            cartId: 1,
            product: { id: 2, stock: 0 },
            quantity: 1,
            totalPrice: 30.00,
          },
          {
            id: 3,
            cartId: 1,
            product: { id: 3, stock: 20 },
            quantity: 5, // Within stock
            totalPrice: 50.00,
          },
        ],
      } as unknown as CartDetail
    })

    it('should identify items with stock issues', () => {
      const issues = store.getItemsWithStockIssues
      // Item 1 has quantity 10 but stock 5 (issue: quantity > stock)
      // Item 2 has stock 0 and quantity 1 (issue: quantity > stock)
      // Item 3 has quantity 5 and stock 20 (no issue)
      expect(issues.length).toBe(2)
      expect(issues[0]!.id).toBe(1)
      expect(issues[1]!.id).toBe(2)
    })

    it('should identify out of stock items', () => {
      const outOfStock = store.getOutOfStockItems
      expect(outOfStock.length).toBe(1)
      expect(outOfStock[0]!.id).toBe(2)
    })

    it('should detect when cart has stock issues', () => {
      expect(store.hasStockIssues).toBe(true)
    })

    it('should detect no stock issues when all items are valid', () => {
      store.cart = {
        ...mockCartData,
        items: [
          {
            id: 1,
            cartId: 1,
            product: { id: 1, stock: 20 },
            quantity: 5,
            totalPrice: 100.00,
          },
        ],
      } as unknown as CartDetail
      expect(store.hasStockIssues).toBe(false)
    })

    it('should check if specific cart item has stock issue', () => {
      const itemWithIssue = store.cart!.items[0] as CartItem
      const itemWithoutIssue = store.cart!.items[2] as CartItem

      expect(store.hasStockIssue(itemWithIssue)).toBe(true)
      expect(store.hasStockIssue(itemWithoutIssue)).toBe(false)
    })

    it('should get available stock for cart item', () => {
      const item = store.cart!.items[0] as CartItem
      expect(store.getAvailableStock(item)).toBe(5)
    })

    it('should return stock status message for out of stock', () => {
      const item = store.cart!.items[1] as CartItem
      const status = store.getStockStatusMessage(item)

      expect(status?.type).toBe('out_of_stock')
      expect(status?.severity).toBe('error')
      expect(status?.message).toBeDefined()
    })

    it('should return stock status message for limited stock', () => {
      const item = store.cart!.items[0] as CartItem
      const status = store.getStockStatusMessage(item)

      expect(status?.type).toBe('limited_stock')
      expect(status?.severity).toBe('warning')
      expect(status?.available).toBe(5)
      expect(status?.requested).toBe(10)
      expect(status?.message).toBeDefined()
    })

    it('should return null for items with sufficient stock', () => {
      const item = store.cart!.items[2] as CartItem
      const status = store.getStockStatusMessage(item)

      expect(status).toBeNull()
    })
  })

  describe('Cart Item Lookup', () => {
    beforeEach(() => {
      store.cart = mockCartData
    })

    it('should find cart item by ID', () => {
      const item = store.getCartItemById(1)
      expect(item).toBeDefined()
      expect(item?.id).toBe(1)
    })

    it('should return null for non-existent cart item ID', () => {
      const item = store.getCartItemById(999)
      expect(item).toBeNull()
    })

    it('should find cart item by product ID', () => {
      const item = store.getCartItemByProductId(1)
      expect(item).toBeDefined()
      expect(item?.product.id).toBe(1)
    })

    it('should return null for non-existent product ID', () => {
      const item = store.getCartItemByProductId(999)
      expect(item).toBeNull()
    })
  })

  describe('Cart Operations', () => {
    describe('createCartItem', () => {
      it('should create cart item successfully', async () => {
        mockFetch.mockResolvedValueOnce({})
        mockFetch.mockResolvedValueOnce(mockCartData)

        const body: CartItemCreateRequest = {
          product: 1,
          quantity: 2,
        }

        await store.createCartItem(body)

        expect(mockFetch).toHaveBeenCalledWith('/api/cart/items', {
          method: 'POST',
          headers: {},
          body,
        })
        expect(store.error).toBeNull()
      })

      it('should handle create cart item error', async () => {
        const error = new Error('Failed to create')
        mockFetch.mockRejectedValueOnce(error)

        const body: CartItemCreateRequest = {
          product: 1,
          quantity: 2,
        }

        await expect(store.createCartItem(body)).rejects.toThrow()
        expect(store.error).toBe(error)
      })

      it('should set pending state during creation', async () => {
        mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const body: CartItemCreateRequest = {
          product: 1,
          quantity: 2,
        }

        const promise = store.createCartItem(body)
        expect(store.pending).toBe(true)

        await promise.catch(() => {})
        expect(store.pending).toBe(false)
      })
    })

    describe('updateCartItem', () => {
      it('should update cart item successfully', async () => {
        mockFetch.mockResolvedValueOnce({})
        mockFetch.mockResolvedValueOnce(mockCartData)

        const body: CartItemUpdateRequest = {
          quantity: 5,
        }

        await store.updateCartItem(1, body)

        expect(mockFetch).toHaveBeenCalledWith('/api/cart/items/1', {
          method: 'PUT',
          body,
        })
        expect(store.error).toBeNull()
      })

      it('should handle update cart item error', async () => {
        const error = new Error('Failed to update')
        mockFetch.mockRejectedValueOnce(error)

        const body: CartItemUpdateRequest = {
          quantity: 5,
        }

        await expect(store.updateCartItem(1, body)).rejects.toThrow()
        expect(store.error).toBe(error)
      })
    })

    describe('deleteCartItem', () => {
      it('should delete cart item successfully', async () => {
        mockFetch.mockResolvedValueOnce({})
        mockFetch.mockResolvedValueOnce(mockCartData)

        await store.deleteCartItem(1)

        expect(mockFetch).toHaveBeenCalledWith('/api/cart/items/1', {
          method: 'DELETE',
          headers: {},
        })
        expect(store.error).toBeNull()
      })

      it('should handle delete cart item error', async () => {
        const error = new Error('Failed to delete')
        mockFetch.mockRejectedValueOnce(error)

        await expect(store.deleteCartItem(1)).rejects.toThrow()
        expect(store.error).toBe(error)
      })
    })

    describe('refreshCart', () => {
      it('should refresh cart data', async () => {
        mockFetch.mockResolvedValueOnce(mockCartData)

        await store.refreshCart()

        expect(mockFetch).toHaveBeenCalledWith('/api/cart', {
          method: 'GET',
          headers: {},
        })
        expect(store.cart).toEqual(mockCartData)
      })

      it('should handle refresh cart error gracefully', async () => {
        const error = new Error('Failed to refresh')
        mockFetch.mockRejectedValueOnce(error)

        await store.refreshCart()

        // Should not throw, just log error
        expect(store.cart).toBeNull()
      })
    })

    describe('cleanCartState', () => {
      it('should reset cart state', () => {
        store.cart = mockCartData
        store.pending = true
        store.error = new Error('Test error') as any

        store.cleanCartState()

        expect(store.cart).toBeNull()
        expect(store.pending).toBe(false)
        expect(store.error).toBeNull()
      })
    })
  })
})
