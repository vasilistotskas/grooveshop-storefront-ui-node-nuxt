import type { IFetchError } from 'ofetch'

export const useCartStore = defineStore('cart', () => {
  const { $i18n } = useNuxtApp()
  const cart = ref<CartDetail | null>(null)
  const pending = ref<boolean>(false)
  const error = ref<IFetchError | null>(null)

  const getCartItems = computed(() => cart.value?.items ?? [])
  const getCartTotalItems = computed(() => cart.value?.totalItems ?? 0)
  const getCartItemIds = computed(() => cart.value?.items?.map(item => item.id) ?? [])

  const getItemsWithStockIssues = computed(() => {
    return cart.value?.items?.filter((item) => {
      return item.product.stock !== undefined
        && item.quantity
        && item.quantity > item.product.stock
    }) ?? []
  })

  const getOutOfStockItems = computed(() => {
    return cart.value?.items?.filter((item) => {
      return item.product.stock === 0
    }) ?? []
  })

  const hasStockIssues = computed(() => {
    return getItemsWithStockIssues.value.length > 0 || getOutOfStockItems.value.length > 0
  })

  const getCartItemById = (id: number) =>
    cart.value?.items?.find(item => item.id === id) ?? null

  const getCartItemByProductId = (id: number) =>
    cart.value?.items?.find(item => item.product.id === id) ?? null

  const hasStockIssue = (cartItem: CartItem) => {
    return cartItem.product.stock !== undefined
      && cartItem.quantity
      && cartItem.quantity > cartItem.product.stock
  }

  const getAvailableStock = (cartItem: CartItem) => {
    return cartItem.product.stock ?? 0
  }

  const getStockStatusMessage = (cartItem: CartItem) => {
    if (!cartItem.product.stock || cartItem.product.stock === 0) {
      return {
        type: 'out_of_stock' as const,
        message: $i18n.t('out_of_stock'),
        severity: 'error' as const,
      }
    }

    if (hasStockIssue(cartItem)) {
      return {
        type: 'limited_stock' as const,
        message: $i18n.t('limited_stock', {
          stock: cartItem.product.stock,
          quantity: cartItem.quantity,
        }),
        severity: 'warning' as const,
        available: cartItem.product.stock,
        requested: cartItem.quantity,
      }
    }

    return null
  }

  async function createCartItem(body: CartItemCreateRequest) {
    try {
      pending.value = true
      await $fetch('/api/cart/items', {
        method: 'POST',
        headers: useRequestHeaders(),
        body,
      })
      await refreshCart()
      error.value = null
    }
    catch (err) {
      console.error('Failed to create cart item:', err)
      error.value = err as IFetchError
      throw err
    }
    finally {
      pending.value = false
    }
  }

  async function updateCartItem(id: number, body: CartItemUpdateRequest) {
    try {
      pending.value = true
      await $fetch(`/api/cart/items/${id}`, {
        method: 'PUT',
        body,
      })
      await refreshCart()
      error.value = null
    }
    catch (err) {
      console.error('Failed to update cart item:', err)
      error.value = err as IFetchError
      throw err
    }
    finally {
      pending.value = false
    }
  }

  async function deleteCartItem(id: number) {
    try {
      pending.value = true
      await $fetch(`/api/cart/items/${id}`, {
        method: 'DELETE',
        headers: useRequestHeaders(),
      })
      await refreshCart()
      error.value = null
    }
    catch (err) {
      console.error('Failed to delete cart item:', err)
      error.value = err as IFetchError
      throw err
    }
    finally {
      pending.value = false
    }
  }

  async function setupCart() {
    const { enabled } = useAuthPreviewMode()

    if (!enabled) {
      return
    }

    try {
      pending.value = true

      const hasExistingCart = await $fetch('/api/cart/check', {
        method: 'GET',
        headers: useRequestHeaders(),
      })

      if (hasExistingCart) {
        const data = await $fetch('/api/cart', {
          method: 'GET',
          headers: useRequestHeaders(),
        })

        if (data) {
          cart.value = data
        }
      }

      error.value = null
    }
    catch (err) {
      console.error('Failed to setup cart:', err)
    }
    finally {
      pending.value = false
    }
  }

  async function refreshCart() {
    try {
      const data = await $fetch('/api/cart', {
        method: 'GET',
        headers: useRequestHeaders(),
      })

      if (data) {
        cart.value = data
      }
    }
    catch (err) {
      console.error('Failed to refresh cart:', err)
    }
  }

  async function cleanCartState() {
    cart.value = null
    pending.value = false
    error.value = null

    // Clear the cart session on the server
    try {
      await $fetch('/api/cart/clear-session', {
        method: 'POST',
      })
    }
    catch (err) {
      console.error('Failed to clear cart session:', err)
    }
  }

  return {
    cart,
    pending,
    error,
    getCartItems,
    getCartTotalItems,
    getCartItemIds,
    getCartItemById,
    getCartItemByProductId,
    getItemsWithStockIssues,
    getOutOfStockItems,
    hasStockIssues,
    hasStockIssue,
    getAvailableStock,
    getStockStatusMessage,
    setupCart,
    refreshCart,
    createCartItem,
    updateCartItem,
    deleteCartItem,
    cleanCartState,
  }
})
