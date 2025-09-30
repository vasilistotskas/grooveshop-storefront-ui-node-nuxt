import type { IFetchError, FetchContext, FetchHooks, FetchResponse } from 'ofetch'

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

  function createFetchHandlers(): FetchHooks {
    return {
      onRequest() {
        console.log('Cart request started')
        pending.value = true
      },
      onRequestError(ctx: FetchContext & { error: Error }) {
        console.error('Cart request error:', ctx)
        error.value = ctx.error as IFetchError
        pending.value = false
        handleError(ctx.error)
      },
      onResponse(ctx: FetchContext & { response: FetchResponse<any> }) {
        console.log('Cart response completed', ctx)
        if (!ctx.response?.ok) {
          error.value = ctx.response._data
          pending.value = false
          return
        }
        cart.value = ctx.response._data
        pending.value = false
      },
      onResponseError(ctx: FetchContext & { response: FetchResponse<any> }) {
        console.error('Cart response error:', ctx)
        error.value = ctx.error ? ctx.error as IFetchError : ctx.response._data
        pending.value = false
        if (ctx.error) {
          handleError(ctx.error)
        }
      },
    }
  }

  function handleError(error: Error) {
    console.error('Cart operation error:', error)
  }

  async function createCartItem(body: CartItemCreateRequest) {
    await $fetch('/api/cart/items', {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      ...createFetchHandlers(),
    })
  }

  async function updateCartItem(id: number, body: CartItemUpdateRequest) {
    await $fetch(`/api/cart/items/${id}`, {
      method: 'PUT',
      body,
      ...createFetchHandlers(),
    })
  }

  async function deleteCartItem(id: number) {
    await $fetch(`/api/cart/items/${id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      ...createFetchHandlers(),
    })
  }

  async function setupCart() {
    const { enabled } = useAuthPreviewMode()

    if (!enabled) {
      return
    }

    try {
      pending.value = true

      const data = await $fetch('/api/cart', {
        method: 'GET',
        headers: useRequestHeaders(),
      })

      if (data) {
        cart.value = data
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
    await $fetch('/api/cart', {
      method: 'GET',
      headers: useRequestHeaders(),
      ...createFetchHandlers(),
    })
  }

  function cleanCartState() {
    cart.value = null
    pending.value = false
    error.value = null
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
