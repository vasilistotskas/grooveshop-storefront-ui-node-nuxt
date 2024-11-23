import { StorageSerializers } from '@vueuse/core'
import type { IFetchError, FetchContext, FetchHooks, FetchResponse } from 'ofetch'

interface ErrorRecord {
  cart: IFetchError | null | undefined
}

interface PendingRecord {
  cart: boolean
}

const errorsFactory = (): ErrorRecord => ({
  cart: null,
})

const pendingFactory = (): PendingRecord => ({
  cart: false,
})

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart | null>(null)
  const pending = ref<PendingRecord>(pendingFactory())
  const error = ref<ErrorRecord>(errorsFactory())
  const { loggedIn } = useUserSession()
  const storage = useLocalStorage<Cart>('cart', null, {
    deep: true,
    listenToStorageChanges: true,
    serializer: StorageSerializers.object,
  })

  const getCartItems = computed(() => cart.value?.cartItems ?? null)
  const getCartTotalItems = computed(() => cart.value?.totalItems ?? 0)

  const getCartItemById = (id: number) =>
    cart.value?.cartItems.find(item => item.id === id) ?? null

  const getCartItemByProductId = (productId: number) =>
    (cart.value?.cartItems
      .map(item => item.product)
      .find(product => product.id === productId) ?? null) as CartItem | null

  function fetchCartFromLocalStorage() {
    if (import.meta.client) {
      const cartFromLocalStorage = storage.value
      if (!cartFromLocalStorage) {
        storage.value = createEmptyCart()
      }
      cart.value = cartFromLocalStorage ?? null
    }
  }

  function createFetchHandlers(): FetchHooks {
    return {
      onRequest(_ctx: FetchContext) {
        pending.value.cart = true
      },
      onRequestError(ctx: FetchContext & { error: Error }) {
        error.value.cart = ctx.error as IFetchError
        pending.value.cart = false
        console.error('Request Error:', ctx.error)
      },
      onResponse(ctx: FetchContext & { response: FetchResponse<any> }) {
        cart.value = ctx.response._data
        pending.value.cart = false
      },
      onResponseError(ctx: FetchContext & { response: FetchResponse<any> }) {
        error.value.cart = ctx.error as IFetchError
        pending.value.cart = false
        console.error('Response Error:', ctx.error)
      },
    }
  }

  async function createCartItem(body: CartItemAddBody) {
    if (import.meta.prerender) return
    if (!loggedIn.value) {
      const newCartItem = mapProductToCartItem(body)
      createCartItemToLocalStorage(newCartItem)
      return
    }

    const requestBody: CartItemCreateBody = {
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
    if (import.meta.prerender) return
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
    if (import.meta.prerender) return
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
    if (import.meta.prerender) return
    if (!loggedIn.value) {
      fetchCartFromLocalStorage()
      return
    }

    await useLazyAsyncData<Cart>('cart', () =>
      $fetch<Cart>('/api/cart', {
        method: 'GET',
        headers: useRequestHeaders(),
        onRequest() {
          pending.value.cart = true
        },
        onRequestError({ error: requestError }) {
          error.value.cart = requestError
        },
        onResponse({ response }) {
          cart.value = response._data
          pending.value.cart = false
        },
        onResponseError({ error: responseError }) {
          error.value.cart = responseError
        },
      }),
    )
  }

  async function refreshCart() {
    if (import.meta.prerender) return
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
      uuid: useId(),
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
      totalPrice: cartItems.reduce((acc, item) => acc + (item?.finalPrice ?? 0) * (item?.quantity ?? 0), 0),
      totalDiscountValue: cartItems.reduce((acc, item) => acc + (item?.discountValue ?? 0) * (item?.quantity ?? 0), 0),
      totalVatValue: cartItems.reduce((acc, item) => acc + (item?.vatValue ?? 0) * (item?.quantity ?? 0), 0),
      totalItems: cartItems.reduce((acc, item) => acc + (item?.quantity ?? 0), 0),
      totalItemsUnique: cartItems.length,
    }
  }

  function createCartItemToLocalStorage(cartItem: CartItem) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }

    const cartItems = cartFromLocalStorage.cartItems
    const existingCartItem = cartItems.find(item => item.product.id === cartItem.product.id)

    if (existingCartItem) {
      existingCartItem.quantity += cartItem.quantity
      existingCartItem.updatedAt = new Date().toISOString()
    }
    else {
      cartItems.push(cartItem)
    }

    updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
  }

  function updateCartItemInLocalStorage(id: number, body: CartItemPutBody) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }
    const cartItems = cartFromLocalStorage.cartItems
    const cartItem = cartItems.find(item => item.id === id)
    if (cartItem) {
      cartItem.quantity = Number(body.quantity)
      updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
    }
  }

  function deleteCartItemFromLocalStorage(id: number) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }
    const cartItems = cartFromLocalStorage.cartItems
    const index = cartItems.findIndex(item => item.id === id)
    if (index !== -1) {
      cartItems.splice(index, 1)
      updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
    }
  }

  function mapProductToCartItem(body: CartItemAddBody): CartItem {
    const productData = { ...body.product }
    return {
      id: Date.now(),
      cart: Date.now(),
      product: productData,
      price: body.product.price,
      finalPrice: body.product.finalPrice,
      quantity: body.quantity,
      totalPrice: body.product.finalPrice * body.quantity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uuid: useId(),
    }
  }

  function cleanCartState() {
    cart.value = null
    pending.value = pendingFactory()
    error.value = errorsFactory()
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
