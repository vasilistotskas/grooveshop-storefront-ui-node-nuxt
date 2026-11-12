/**
 * Save a product to the shopper's favourites, or take it off them: the
 * heart button's behaviour, apart from its drawing
 * (`Button/Product/AddToFavourite` and the tenants' own).
 *
 * Every heart asks for its own product's state when it mounts, signed in
 * and with the store's favourites on (`lookUpFavourites`: the hearts of
 * one render go in one request), so whatever draws a heart (a band, a
 * rail, a suggestion strip, the listing, a product page, a section that
 * hydrates later) shows the shopper's favourite without asking for it
 * itself. Not before mount: the page is rendered anonymously, and the
 * first client render must be that render. A sign-in later asks again.
 *
 * A favourite is created by product and deleted by its own id, so the
 * button says which one it holds (`favouriteId`, `null` for none yet);
 * `toggle` does the other. A guest gets "sign in first" and no request.
 * One request at a time (`isLoading`). The user store follows the
 * server's answer, and `onDeleted` tells the drawing which favourite
 * went (the favourites lists drop its card). A failure is one toast with
 * Django's reason, behind the headline `t('error_occurred')`.
 *
 * Except when the server says the shopper already has what they asked for:
 * `already_favourited` on an add (the heart showed the guest's state, or
 * another tab saved it) and a 404 on a removal (the favourite is gone).
 * The store then follows the server instead: the add asks the favourite's
 * id again (`lookUpFavourites` with `refresh`), the removal drops it, and
 * the shopper gets the toast of the change they wanted, not an error.
 */
export function useProductFavouriteToggle(options: {
  productId: () => number
  userId: () => number | null | undefined
  favouriteId: () => number | null
  t: ReturnType<typeof useI18n>['t']
  onDeleted: (favouriteId: number) => void
}) {
  const { t } = options
  const toast = useToast()
  const { notify } = useApiError()
  const { loggedIn } = useUserSession()
  const { addFavouriteProduct, removeFavouriteProduct, lookUpFavourites } = useUserStore()
  const favouritesEnabled = useStoreFeature('favourites')

  const isLoading = ref(false)

  onMounted(() => {
    watchEffect(() => {
      if (loggedIn.value && favouritesEnabled.value) lookUpFavourites([options.productId()])
    })
  })

  /** The heart is now what the shopper asked for: switched on, or off. */
  function announce(change: 'added' | 'removed') {
    toast.add({ title: t(change), color: change === 'added' ? 'success' : 'error' })
  }

  async function toggle() {
    if (!loggedIn.value || !options.userId()) {
      toast.add({
        title: t('not_authenticated'),
        color: 'error',
      })
      return
    }

    if (isLoading.value) {
      return
    }

    isLoading.value = true
    const productId = options.productId()
    const favouriteId = options.favouriteId()
    try {
      if (!favouriteId) {
        const favourite = await $api('/api/products/favourites', {
          method: 'POST',
          body: {
            product: productId,
          },
        })
        addFavouriteProduct(favourite)
        announce('added')
      }
      else {
        await $api(`/api/products/favourites/${favouriteId}`, { method: 'DELETE' })
        options.onDeleted(favouriteId)
        removeFavouriteProduct(productId)
        announce('removed')
      }
    }
    catch (error) {
      const { code, status } = describeApiError(error)
      if (!favouriteId && code === 'already_favourited') {
        lookUpFavourites([productId], { refresh: true })
        announce('added')
        return
      }
      if (favouriteId && status === 404) {
        options.onDeleted(favouriteId)
        removeFavouriteProduct(productId)
        announce('removed')
        return
      }
      // One toast for every other failure: an HTTP refusal carries
      // Django's `detail`, a network failure does not.
      log.error({ action: 'favourite:toggle', error })
      notify('Product-AddToFavourite', error, { title: t('error_occurred') })
    }
    finally {
      isLoading.value = false
    }
  }

  return { isLoading, toggle }
}
