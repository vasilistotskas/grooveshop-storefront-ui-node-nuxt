export const useCartStore = defineStore('cart', () => {
  const nuxtApp = useNuxtApp()
  const { $i18n } = nuxtApp
  const { loggedIn } = useUserSession()
  const t = $i18n.t.bind($i18n)
  // Capture the pixel + GA4 proxies at store-setup time so the
  // action body doesn't call ``useScriptMetaPixel`` /
  // ``useScriptTikTokPixel`` / ``useScriptGoogleAnalytics`` from
  // outside Nuxt's component setup context (Pinia store actions
  // persist across the app's lifecycle while individual page setups
  // come and go).
  const metaPixel = useMetaPixel()
  const tiktokPixel = useTikTokPixel()
  const openaiPixel = useOpenAIPixel()
  const ga4 = useGA4()
  const googleAds = useGoogleAds()
  const attribution = useRecommendationAttribution()
  const cart = ref<CartDetail | null>(null)
  const inFlight = reactive(new Set<string>())
  const pending = computed(() => inFlight.size > 0)
  // True only while the cart is being loaded for the first time (no data yet).
  // Use this to gate loading skeletons so item mutations — which also flip
  // `pending` — don't unmount the list and destroy the quantity selector
  // mid-interaction.
  const initialLoading = computed(() => pending.value && cart.value === null)
  const error = ref<SerializedError | null>(null)
  // True once the first cart read has answered — with a cart or with
  // none (a visitor who never added anything gets a 204). `cart` alone
  // cannot tell "no cart" from "not asked yet".
  const loaded = ref(false)

  const getCartItems = computed(() => cart.value?.items ?? [])
  const getCartTotalItems = computed(() => cart.value?.totalItems ?? 0)
  const getCartItemIds = computed(() => cart.value?.items?.map(item => item.id) ?? [])

  // Django's `stock` is a PositiveIntegerField defaulting to 0 and always
  // serialised; the contract marks it optional, so a missing figure is that
  // default. Every stock rule reads it through here, so the line a message
  // calls sold out is the line the checks flag.
  const getAvailableStock = (cartItem: CartItem) => cartItem.product.stock ?? 0

  const hasStockIssue = (cartItem: CartItem) =>
    (cartItem.quantity ?? 0) > getAvailableStock(cartItem)

  const getItemsWithStockIssues = computed(() => cart.value?.items?.filter(hasStockIssue) ?? [])

  const getOutOfStockItems = computed(() =>
    cart.value?.items?.filter(item => getAvailableStock(item) === 0) ?? [],
  )

  const hasStockIssues = computed(() => {
    return getItemsWithStockIssues.value.length > 0 || getOutOfStockItems.value.length > 0
  })

  const getCartItemById = (id: number) =>
    cart.value?.items?.find(item => item.id === id) ?? null

  const getCartItemByProductId = (id: number) =>
    cart.value?.items?.find(item => item.product.id === id) ?? null

  const getStockStatusMessage = (cartItem: CartItem) => {
    const available = getAvailableStock(cartItem)
    if (available === 0) {
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
          stock: available,
          quantity: cartItem.quantity,
        }),
        severity: 'warning' as const,
        available,
        requested: cartItem.quantity,
      }
    }

    return null
  }

  /**
   * Fan out add_to_cart / remove_from_cart analytics for a signed
   * cart quantity change (``+2`` = two units added). EVERY quantity
   * increase is an add_to_cart — including bumping a product that is
   * already in the cart (that path previously fired nothing, so only
   * the first-ever add of a product produced events). Decreases map
   * to GA4's ``remove_from_cart`` only: Meta and TikTok define no
   * standard removal event. Tracking must never break the cart UX —
   * failures are logged and swallowed.
   *
   * Exposed on the store for flows that mutate the cart server-side
   * (e.g. order reorder) and therefore bypass the create/update/delete
   * actions above.
   */
  function trackCartQuantityChange(
    productId: number,
    delta: number,
    unitPrice: number,
  ) {
    if (!delta) return
    try {
      const quantity = Math.abs(delta)
      const currency = cart.value?.currency ?? useTenantStore().defaultCurrency
      const value = Number((unitPrice * quantity).toFixed(2))

      if (delta > 0) {
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

        openaiPixel.trackItemsAdded({
          currency,
          amount: value,
          contents: [
            {
              id: String(productId),
              contentType: 'product',
              quantity,
            },
          ],
        })

        tiktokPixel.trackAddToCart({
          currency,
          value,
          contentType: 'product',
          contents: [
            {
              contentId: String(productId),
              quantity,
              price: unitPrice,
            },
          ],
        })

        googleAds.trackAddToCart({ currency, value })

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
      else {
        ga4.trackRemoveFromCart({
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
      log.warn(
        'cart:trackQuantityChange',
        String((pixelErr as Error)?.message ?? pixelErr),
      )
    }
  }

  async function createCartItem(body: CartItemCreateRequest) {
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    try {
      // The one choke point every add-to-cart goes through (product
      // page, card, suggestion tile): carry the strip impression the
      // shopper reached this product from, if there is one, so the
      // backend can attach the eventual order line to it exactly.
      const recommendationImpressionId = attribution.take(body.product)
      await $api('/api/cart/items', {
        method: 'POST',
        headers: useRequestHeaders(),
        body: recommendationImpressionId
          ? { ...body, recommendationImpressionId }
          : body,
      })
      await refreshCart()
      error.value = null

      // Analytics fire only after the cart was successfully updated
      // (so a server-side rejection — out of stock, invalid product —
      // never produces a pixel event). The added item is looked up
      // from the freshly refreshed cart so value/currency reflect
      // what the server actually persisted.
      const productId = body.product
      const addedItem = cart.value?.items?.find(
        item => item.product?.id === productId,
      )
      if (addedItem) {
        const unitPrice = Number(
          addedItem.product?.finalPrice ?? addedItem.product?.price ?? 0,
        )
        trackCartQuantityChange(
          productId,
          Number(body.quantity ?? addedItem.quantity ?? 1),
          unitPrice,
        )
      }
      else {
        // A silent miss here is indistinguishable from "analytics
        // broken" — make the skip observable.
        log.warn(
          'cart:trackQuantityChange',
          `product ${productId} not found in refreshed cart — add_to_cart not tracked`,
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
    // Snapshot BEFORE the PUT — the quantity delta decides whether
    // this update tracks as add_to_cart (increase) or
    // remove_from_cart (decrease).
    const prevQuantity = Number(getCartItemById(id)?.quantity ?? 0)
    // A quantity bump on a line the shopper just reached through a
    // strip carries the impression the same way an add does.
    const lineProductId = getCartItemById(id)?.product?.id
    const recommendationImpressionId = typeof lineProductId === 'number'
      ? attribution.take(lineProductId)
      : undefined
    try {
      await $api(`/api/cart/items/${id}`, {
        method: 'PUT',
        headers: useRequestHeaders(),
        body: recommendationImpressionId
          ? { ...body, recommendationImpressionId }
          : body,
      })
      await refreshCart()
      error.value = null

      const updatedItem = getCartItemById(id)
      if (updatedItem?.product?.id) {
        const newQuantity = Number(updatedItem.quantity ?? body.quantity ?? 0)
        const unitPrice = Number(
          updatedItem.product?.finalPrice ?? updatedItem.product?.price ?? 0,
        )
        trackCartQuantityChange(
          updatedItem.product.id,
          newQuantity - prevQuantity,
          unitPrice,
        )
      }
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
      await $api(`/api/cart/items/${id}`, {
        method: 'DELETE',
        headers: useRequestHeaders(),
      })
      await refreshCart()
      error.value = null

      if (removedItem?.product?.id) {
        const unitPrice = Number(
          removedItem.product?.finalPrice ?? removedItem.product?.price ?? 0,
        )
        trackCartQuantityChange(
          removedItem.product.id,
          -Number(removedItem.quantity ?? 1),
          unitPrice,
        )
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

  /**
   * Empty the cart ("Empty cart"): Django deletes the cart and the session
   * forgets it, so there is no cart until the next item starts one. Each
   * line leaves the analytics the way a single removal does.
   */
  async function clearCart() {
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    const removedItems = cart.value?.items ?? []
    try {
      await $api('/api/cart', {
        method: 'DELETE',
        headers: useRequestHeaders(),
      })
      cart.value = null
      error.value = null
      for (const item of removedItems) {
        if (!item.product?.id) continue
        trackCartQuantityChange(
          item.product.id,
          -Number(item.quantity ?? 1),
          Number(item.product.finalPrice ?? item.product.price ?? 0),
        )
      }
    }
    catch (err) {
      log.error({ action: 'cart:clear', error: err })
      error.value = serializeError(err)
      throw err
    }
    finally {
      inFlight.delete(opId)
    }
  }

  /** Where a cart load ran, for the logs: the page, and whether it hydrated cached markup. */
  function cartLoadContext() {
    return {
      signedIn: loggedIn.value,
      page: import.meta.client ? window.location.pathname : undefined,
      cachedPage: Boolean(nuxtApp.payload.isCached),
    }
  }

  async function setupCart() {
    const headers = useRequestHeaders()
    const opId = crypto.randomUUID()
    inFlight.add(opId)
    try {
      const data = await $api('/api/cart', {
        method: 'GET',
        headers,
      })

      cart.value = data ?? null
      error.value = null
      // A signed-in shopper always has a cart in Django (the API creates
      // one on read), so no cart here means the load went wrong upstream
      // and the shopper now sees an empty cart over their real one. Kept
      // at error level: production samples warnings.
      if (loggedIn.value && !data) {
        log.error({ action: 'cart:setup:signed-in-without-cart', ...cartLoadContext() })
      }
    }
    catch (err) {
      log.error({ action: 'cart:setup', error: err, ...cartLoadContext() })
    }
    finally {
      inFlight.delete(opId)
      loaded.value = true
    }
  }

  async function refreshCart() {
    try {
      const data = await $api('/api/cart', {
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
      await $api('/api/cart/clear-session', { method: 'POST' })
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
    loaded,
    pending,
    initialLoading,
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
    clearCart,
    cleanCartState,
    trackCartQuantityChange,
  }
})
