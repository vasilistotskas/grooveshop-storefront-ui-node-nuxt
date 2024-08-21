import { StorageSerializers } from '@vueuse/core'
import type { IFetchError } from 'ofetch'
import { v4 as uuidv4 } from 'uuid'

import type { Index } from '~/types/cart'
import type {
  Item,
  CartItemAddBody,
  CartItemCreateBody,
  CartItemPutBody,
} from '~/types/cart/item'

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
  const cart = ref<Index | null>(null)
  const pending = ref<PendingRecord>(pendingFactory())
  const error = ref<ErrorRecord>(errorsFactory())
  const { loggedIn } = useUserSession()
  const storage = useLocalStorage<Index>('cart', null, {
    deep: true,
    listenToStorageChanges: true,
    serializer: StorageSerializers.object,
  })

  const getCartItems = computed(() => {
    return cart.value?.cartItems ?? null
  })

  const getCartTotalItems = computed(() => {
    return cart.value?.totalItems ?? 0
  })

  const getCartItemById = (id: number) => {
    return cart.value?.cartItems.find(item => item.id === id) ?? null
  }

  const getCartItemByProductId = (productId: number) => {
    return (cart.value?.cartItems
      .map(item => item.product)
      .find(product => product.id === productId) ?? null) as Item | null
  }

  function fetchCartFromLocalStorage() {
    if (import.meta.client) {
      const cartFromLocalStorage = storage.value
      if (!cartFromLocalStorage) {
        storage.value = {
          id: Date.now(),
          uuid: uuidv4(),
          user: null,
          totalPrice: 0,
          totalDiscountValue: 0,
          totalVatValue: 0,
          totalItems: 0,
          totalItemsUnique: 0,
          cartItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      cart.value = cartFromLocalStorage ?? null
    }
  }

  async function fetchCart() {
    if (import.meta.prerender) {
      return
    }

    if (!loggedIn.value) {
      fetchCartFromLocalStorage()
      return
    }

    await useLazyAsyncData('cart', () =>
      $fetch('/api/cart', {
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
    if (import.meta.prerender) {
      return
    }

    if (!loggedIn.value) {
      fetchCartFromLocalStorage()
      return
    }

    await $fetch('/api/cart', {
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
    })
  }

  function updateLocalStorageCartTotals(
    cartFromLocalStorage: Index,
    cartItems: Item[],
  ) {
    const totalPrice = cartItems.reduce(
      (acc, item) => acc + (item?.finalPrice ?? 0) * (item?.quantity ?? 0),
      0,
    )
    const totalDiscountValue = cartItems.reduce(
      (acc, item) => acc + (item?.discountValue ?? 0) * (item?.quantity ?? 0),
      0,
    )
    const totalVatValue = cartItems.reduce(
      (acc, item) => acc + (item?.vatValue ?? 0) * (item?.quantity ?? 0),
      0,
    )
    const totalItems = cartItems.reduce(
      (acc, item) => acc + (item?.quantity ?? 0),
      0,
    )
    const totalItemsUnique = cartItems.length

    storage.value = {
      ...cartFromLocalStorage,
      totalPrice,
      totalDiscountValue,
      totalVatValue,
      totalItems,
      totalItemsUnique,
      cartItems,
      updatedAt: new Date().toISOString(),
    }
  }

  function createCartItemToLocalStorage(cartItem: Item) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }

    const cartItems = cartFromLocalStorage?.cartItems ?? []
    const existingCartItem = cartItems.find(
      item => item.product.id === cartItem.product.id,
    )

    if (existingCartItem) {
      existingCartItem.quantity += cartItem.quantity
      existingCartItem.updatedAt = new Date().toISOString()
    }
    else {
      cartItems.push(cartItem)
    }

    updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
  }

  async function createCartItem(body: CartItemAddBody) {
    if (import.meta.prerender) {
      return
    }
    if (!loggedIn.value) {
      const productData = {
        translations: JSON.parse(JSON.stringify(body.product.translations)),
        id: body.product.id,
        slug: body.product.slug,
        category: body.product.category,
        absoluteUrl: body.product.absoluteUrl,
        price: body.product.price,
        vat: body.product.vat,
        vatPercent: body.product.vatPercent,
        vatValue: body.product.vatValue,
        finalPrice: body.product.finalPrice,
        viewCount: body.product.viewCount,
        likesCount: body.product.likesCount,
        stock: body.product.stock,
        active: body.product.active,
        weight: body.product.weight,
        seoTitle: body.product.seoTitle,
        seoDescription: body.product.seoDescription,
        seoKeywords: body.product.seoKeywords,
        uuid: body.product.uuid,
        discountPercent: body.product.discountPercent,
        discountValue: body.product.discountValue,
        priceSavePercent: body.product.priceSavePercent,
        createdAt: body.product.createdAt,
        updatedAt: body.product.updatedAt,
        mainImageAbsoluteUrl: body.product.mainImageAbsoluteUrl,
        mainImageFilename: body.product.mainImageFilename,
        reviewAverage: body.product.reviewAverage,
        approvedReviewAverage: body.product.approvedReviewAverage,
        reviewCount: body.product.reviewCount,
        approvedReviewCount: body.product.approvedReviewCount,
      }
      const newCartItem = {
        id: Date.now(),
        cart: Date.now(),
        product: productData,
        price: body.product.price,
        finalPrice: body.product.finalPrice,
        quantity: body.quantity,
        totalPrice: body.product.finalPrice * body.quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uuid: uuidv4(),
      }
      createCartItemToLocalStorage(newCartItem)
      return
    }

    const requestBody: CartItemCreateBody = {
      product: body.product.id.toString(),
      quantity: body.quantity.toString(),
    }

    await $fetch('/api/cart/items', {
      method: 'POST',
      headers: useRequestHeaders(),
      body: requestBody,
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
    })
  }

  function updateCartItemInLocalStorage(id: number, body: CartItemPutBody) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }
    const cartItems = cartFromLocalStorage?.cartItems ?? []
    const cartItem = cartItems.find(item => item.id === id)
    if (!cartItem) {
      return
    }
    cartItem.quantity = Number(body.quantity)

    updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
  }

  async function updateCartItem(id: number, body: CartItemPutBody) {
    if (import.meta.prerender) {
      return
    }

    if (!loggedIn.value) {
      updateCartItemInLocalStorage(id, body)
      return
    }

    await $fetch(`/api/cart/items/${id}`, {
      method: 'PUT',
      body,
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
    })
  }

  function deleteCartItemFromLocalStorage(id: number) {
    const cartFromLocalStorage = storage.value
    if (!cartFromLocalStorage) {
      console.error('Cart not found in Local Storage')
      return
    }
    const cartItems = cartFromLocalStorage?.cartItems ?? []
    const cartItemIndex = cartItems.findIndex(item => item.id === Number(id))
    if (cartItemIndex !== -1) {
      cartItems.splice(cartItemIndex, 1)
    }

    updateLocalStorageCartTotals(cartFromLocalStorage, cartItems)
  }

  async function deleteCartItem(id: number) {
    if (import.meta.prerender) {
      return
    }

    if (!loggedIn.value) {
      deleteCartItemFromLocalStorage(id)
      return
    }

    await $fetch(`/api/cart/items/${id}`, {
      method: 'DELETE',
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
    })
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
