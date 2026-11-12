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
    try {
      const productId = options.productId()
      const favouriteId = options.favouriteId()
      if (!favouriteId) {
        const favourite = await $api('/api/products/favourites', {
          method: 'POST',
          body: {
            product: productId,
          },
        })
        addFavouriteProduct(favourite)
        toast.add({
          title: t('added'),
          color: 'success',
        })
      }
      else {
        await $api(`/api/products/favourites/${favouriteId}`, { method: 'DELETE' })
        options.onDeleted(favouriteId)
        removeFavouriteProduct(productId)
        toast.add({
          title: t('removed'),
          color: 'error',
        })
      }
    }
    catch (error) {
      // One toast for every failure: an HTTP refusal carries Django's
      // `detail`, a network failure does not.
      log.error({ action: 'favourite:toggle', error })
      notify('Product-AddToFavourite', error, { title: t('error_occurred') })
    }
    finally {
      isLoading.value = false
    }
  }

  return { isLoading, toggle }
}
