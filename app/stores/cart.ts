import type { IFetchError, FetchContext, FetchHooks, FetchResponse } from 'ofetch'

export const useCartStore = defineStore('cart', () => {
  const cart = ref<CartDetail | null>(null)
  const pending = ref<boolean>(false)
  const error = ref<IFetchError | null>(null)

  const getCartItems = computed(() => cart.value?.items ?? [])
  const getCartTotalItems = computed(() => cart.value?.totalItems ?? 0)
  const getCartItemIds = computed(() => cart.value?.items?.map((item: any) => item.id) ?? [])

  const getCartItemById = (id: number) =>
    cart.value?.items?.find((item: any) => item.id === id) ?? null

  const getCartItemByProductId = (id: number) =>
    cart.value?.items?.find((item: any) => item.product === id) ?? null

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
        cart.value = ctx.response._data
        pending.value = false
      },
      onResponseError(ctx: FetchContext & { response: FetchResponse<any> }) {
        console.error('Cart response error:', ctx)
        error.value = ctx.error as IFetchError
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

  async function createCartItem(body: Omit<CartItemWriteRequest, 'cart'>) {
    if (!cart.value) {
      throw new Error('Cart not found')
    }

    const requestBody = {
      cart: cart.value.id,
      product: body.product,
      quantity: body.quantity,
    }

    await $fetch<CartItemDetail>('/api/cart/items', {
      method: 'POST',
      headers: useRequestHeaders(),
      body: requestBody,
      ...createFetchHandlers(),
    })
  }

  async function updateCartItem(id: number, body: PatchedCartItemWriteRequest) {
    await $fetch<CartItem>(`/api/cart/items/${id}`, {
      method: 'PATCH',
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

    const { data, error: fetchError } = await useFetch<CartDetail>(
      '/api/cart',
      {
        key: 'cart',
        method: 'GET',
        headers: useRequestHeaders(),
      },
    )

    if (fetchError.value) {
      error.value = fetchError.value
    }

    if (data.value) {
      cart.value = data.value
    }

    pending.value = false
  }

  async function refreshCart() {
    await $fetch<CartDetail>('/api/cart', {
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
    setupCart,
    refreshCart,
    createCartItem,
    updateCartItem,
    deleteCartItem,
    cleanCartState,
  }
})
