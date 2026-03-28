export const useCartStore = defineStore('cart', () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const cart = ref<CartDetail | null>(null)
  const pending = ref<boolean>(false)
  const error = ref<SerializedError | null>(null)

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
        message: t('out_of_stock'),
        severity: 'error' as const,
      }
    }

    if (hasStockIssue(cartItem)) {
      return {
        type: 'limited_stock' as const,
        message: t('limited_stock', {
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
      log.error({ action: 'cart:createItem', error: err })
      error.value = serializeError(err)
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
        headers: useRequestHeaders(),
        body,
      })
      await refreshCart()
      error.value = null
    }
    catch (err) {
      log.error({ action: 'cart:updateItem', error: err })
      error.value = serializeError(err)
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
      log.error({ action: 'cart:deleteItem', error: err })
      error.value = serializeError(err)
      throw err
    }
    finally {
      pending.value = false
    }
  }

  async function setupCart() {
    const headers = useRequestHeaders()
    try {
      pending.value = true

      const hasExistingCart = await $fetch('/api/cart/check', {
        method: 'GET',
        headers,
      })

      if (hasExistingCart) {
        const data = await $fetch('/api/cart', {
          method: 'GET',
          headers,
        })

        if (data) {
          cart.value = data
        }
      }
      else {
        cart.value = null
      }

      error.value = null
    }
    catch (err) {
      log.error({ action: 'cart:setup', error: err })
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
      log.error({ action: 'cart:refresh', error: err })
    }
  }

  async function cleanCartState() {
    try {
      await $fetch('/api/cart/clear-session', { method: 'POST' })
      cart.value = null
      pending.value = false
      error.value = null
    }
    catch (err) {
      log.error({ action: 'cart:clearSession', error: err })
      cart.value = null
      pending.value = false
      error.value = null
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
