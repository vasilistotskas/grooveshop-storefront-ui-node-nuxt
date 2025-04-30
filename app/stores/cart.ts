import { StorageSerializers } from '@vueuse/core'
import type { IFetchError, FetchContext, FetchHooks, FetchResponse } from 'ofetch'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart | null>(null)
  const pending = ref<boolean>(false)
  const error = ref<IFetchError | null>(null)
  const { loggedIn } = useUserSession()
  const storage = useLocalStorage<Cart>('cart', null, {
    deep: true,
    listenToStorageChanges: true,
    serializer: StorageSerializers.object,
  })

  const getCartItems = computed(() => cart.value?.cartItems ?? [])
  const getCartTotalItems = computed(() => cart.value?.totalItems ?? 0)

  const getCartItemById = (id: number) =>
    cart.value?.cartItems.find(item => item.id === id) ?? null

  const getCartItemByProductId = (id: number) =>
    cart.value?.cartItems.find(item => item.product.id === id) ?? null

  function fetchCartFromLocalStorage() {
    if (import.meta.client) {
      const cartFromLocalStorage = storage.value ?? createEmptyCart()
      cart.value = cartFromLocalStorage
      storage.value = cartFromLocalStorage
    }
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

  async function createCartItem(body: CartItemPostBody) {
    if (!loggedIn.value) {
      createCartItemToLocalStorage(body)
      return
    }

    if (!cart.value) {
      throw new Error('Cart not found')
    }

    const requestBody: CartItemCreateBody = {
      cart: cart.value.id.toString(),
      product: body.product.id.toString(),
      quantity: body.quantity.toString(),
    }

    await $fetch<CartItemCreateResponse>('/api/cart/items', {
      method: 'POST',
      headers: useRequestHeaders(),
      body: requestBody,
      ...createFetchHandlers(),
    })
  }

  async function updateCartItem(id: number, body: CartItemPutBody) {
    if (!loggedIn.value) {
      updateCartItemInLocalStorage(id, body)
      return
    }

    await $fetch<CartItem>(`/api/cart/items/${id}`, {
      method: 'PUT',
      body,
      ...createFetchHandlers(),
    })
  }

  async function deleteCartItem(id: number) {
    if (!loggedIn.value) {
      deleteCartItemFromLocalStorage(id)
      return
    }

    await $fetch(`/api/cart/items/${id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      ...createFetchHandlers(),
    })
  }

  async function fetchCart() {
    pending.value = true
    if (!loggedIn.value) {
      fetchCartFromLocalStorage()
      pending.value = false
      return
    }

    const { data, error: fetchError } = await useFetch<Cart>(
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
    if (!loggedIn.value) {
      fetchCartFromLocalStorage()
      return
    }

    await $fetch<Cart>('/api/cart', {
      method: 'GET',
      headers: useRequestHeaders(),
      ...createFetchHandlers(),
    })
  }

  function createEmptyCart(): Cart {
    const now = new Date().toISOString()
    return {
      id: Date.now(),
      uuid: generateUUID(),
      user: null,
      totalPrice: 0,
      totalDiscountValue: 0,
      totalVatValue: 0,
      totalItems: 0,
      totalItemsUnique: 0,
      cartItems: [],
      createdAt: now,
      updatedAt: now,
    }
  }

  function updateLocalStorageCartTotals(cartFromLocalStorage: Cart, cartItems: CartItem[]) {
    const totals = calculateCartTotals(cartItems)
    storage.value = { ...cartFromLocalStorage, ...totals, cartItems, updatedAt: new Date().toISOString() }
  }

  function calculateCartTotals(cartItems: CartItem[]) {
    return {
      totalPrice: cartItems.reduce((acc, item) => acc + (item.finalPrice ?? 0) * (item.quantity ?? 0), 0),
      totalDiscountValue: cartItems.reduce((acc, item) => acc + (item.discountValue ?? 0) * (item.quantity ?? 0), 0),
      totalVatValue: cartItems.reduce((acc, item) => acc + (item.vatValue ?? 0) * (item.quantity ?? 0), 0),
      totalItems: cartItems.reduce((acc, item) => acc + (item.quantity ?? 0), 0),
      totalItemsUnique: cartItems.length,
    }
  }

  function createCartItemToLocalStorage(body: CartItemPostBody) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }

    const cartItems = cartFromLocalStorage.cartItems
    const existingCartItem = cartItems.find(item => item.product.id === body.product.id)

    if (existingCartItem) {
      existingCartItem.quantity += body.quantity
      existingCartItem.updatedAt = new Date().toISOString()
    }
    else {
      const newCartItem = mapProductToCartItem(body)
      cartItems.push(newCartItem)
    }

    updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
  }

  function updateCartItemInLocalStorage(id: number, body: CartItemPutBody) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }

    const cartItem = cartFromLocalStorage.cartItems.find(item => item.id === id)
    if (cartItem) {
      cartItem.quantity = Number(body.quantity)
      updateLocalStorageCartTotals(cartFromLocalStorage, cartFromLocalStorage.cartItems)
    }
  }

  function deleteCartItemFromLocalStorage(id: number) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }

    const index = cartFromLocalStorage.cartItems.findIndex(item => item.id === id)
    if (index !== -1) {
      cartFromLocalStorage.cartItems.splice(index, 1)
      updateLocalStorageCartTotals(cartFromLocalStorage, cartFromLocalStorage.cartItems)
    }
  }

  function mapProductToCartItem(body: CartItemPostBody): CartItem {
    return {
      id: Date.now(),
      cart: Date.now(),
      product: { ...body.product },
      price: body.product.price,
      finalPrice: body.product.finalPrice,
      quantity: body.quantity,
      totalPrice: body.product.finalPrice * body.quantity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uuid: generateUUID(),
    }
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
    getCartItemById,
    getCartItemByProductId,
    fetchCart,
    refreshCart,
    createCartItem,
    updateCartItem,
    deleteCartItem,
    cleanCartState,
  }
})
