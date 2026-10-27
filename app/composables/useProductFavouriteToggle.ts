/**
 * Save a product to the shopper's favourites, or take it off them: the
 * heart button's behaviour, apart from its drawing
 * (`Button/Product/AddToFavourite` and the tenants' own).
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
  const { addFavouriteProduct, removeFavouriteProduct } = useUserStore()

  const isLoading = ref(false)

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
