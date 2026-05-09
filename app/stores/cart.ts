export const useCartStore = defineStore('cart', () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  // Capture the Meta Pixel + GA4 proxies at store-setup time so the
  // action body doesn't call ``useScriptMetaPixel`` /
  // ``useScriptGoogleAnalytics`` from outside Nuxt's component setup
  // context (Pinia store actions persist across the app's lifecycle
  // while individual page setups come and go).
  const metaPixel = useMetaPixel()
  const ga4 = useGA4()
  const cart = ref<CartDetail | null>(null)
  const inFlight = reactive(new Set<string>())
  const pending = computed(() => inFlight.size > 0)
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
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    try {
      await $fetch('/api/cart/items', {
        method: 'POST',
        headers: useRequestHeaders(),
        body,
      })
      await refreshCart()
      error.value = null

      // Meta Pixel: AddToCart fires after the cart was successfully
      // updated (so a server-side rejection — out of stock, invalid
      // product — never produces a pixel event). The added item is
      // looked up from the freshly refreshed cart so the value /
      // currency reflect the item the server actually persisted.
      try {
        const productId = body.product
        const addedItem = cart.value?.items?.find(
          item => item.product?.id === productId,
        )
        if (addedItem) {
          const unitPrice = Number(
            addedItem.product?.finalPrice ?? addedItem.product?.price ?? 0,
          )
          const quantity = Number(body.quantity ?? addedItem.quantity ?? 1)
          const currency = cart.value?.currency ?? 'EUR'
          const value = Number((unitPrice * quantity).toFixed(2))

          metaPixel.trackAddToCart({
            currency,
            value,
            contentIds: [String(productId)],
            contents: [
              {
                id: String(productId),
                quantity,
                itemPrice: unitPrice,
              },
            ],
            contentType: 'product',
          })

          ga4.trackAddToCart({
            currency,
            value,
            items: [
              {
                item_id: String(productId),
                quantity,
                price: unitPrice,
              },
            ],
          })
        }
      }
      catch (pixelErr) {
        // Telemetry failures must never break the cart UX.
        log.warn(
          'cart:metaPixelAddToCart',
          String((pixelErr as Error)?.message ?? pixelErr),
        )
      }
    }
    catch (err) {
      log.error({ action: 'cart:createItem', error: err })
      error.value = serializeError(err)
      throw err
    }
    finally {
      inFlight.delete(opId)
    }
  }

  async function updateCartItem(id: number, body: CartItemUpdateRequest) {
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    try {
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
      inFlight.delete(opId)
    }
  }

  async function deleteCartItem(id: number) {
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    // Snapshot the item BEFORE the DELETE so the analytics event has
    // accurate price/quantity. Polling the cart afterwards would
    // miss the row entirely (it's gone).
    const removedItem = cart.value?.items?.find(item => item.id === id)
    try {
      await $fetch(`/api/cart/items/${id}`, {
        method: 'DELETE',
        headers: useRequestHeaders(),
      })
      await refreshCart()
      error.value = null

      if (removedItem) {
        try {
          const productId = removedItem.product?.id
          const unitPrice = Number(
            removedItem.product?.finalPrice
            ?? removedItem.product?.price
            ?? 0,
          )
          const quantity = Number(removedItem.quantity ?? 1)
          ga4.trackRemoveFromCart({
            currency: cart.value?.currency ?? 'EUR',
            value: Number((unitPrice * quantity).toFixed(2)),
            items: productId
              ? [
                  {
                    item_id: String(productId),
                    quantity,
                    price: unitPrice,
                  },
                ]
              : [],
          })
        }
        catch (pixelErr) {
          log.warn(
            'cart:ga4RemoveFromCart',
            String((pixelErr as Error)?.message ?? pixelErr),
          )
        }
      }
    }
    catch (err) {
      log.error({ action: 'cart:deleteItem', error: err })
      error.value = serializeError(err)
      throw err
    }
    finally {
      inFlight.delete(opId)
    }
  }

  async function setupCart() {
    const headers = useRequestHeaders()
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    try {
      const data = await $fetch('/api/cart', {
        method: 'GET',
        headers,
      })

      cart.value = data ?? null
      error.value = null
    }
    catch (err) {
      log.error({ action: 'cart:setup', error: err })
    }
    finally {
      inFlight.delete(opId)
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
      inFlight.clear()
      error.value = null
    }
    catch (err) {
      log.error({ action: 'cart:clearSession', error: err })
      cart.value = null
      inFlight.clear()
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
