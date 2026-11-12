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
 * For the same reason the heart DRAWS `drawnFavouriteId` from here, not the
 * one it was given: the guest's (none) until it has mounted, the store's
 * after. A heart that hydrates after another one asked for its product (a
 * section hydrated on scroll, under the grid that already asked) would
 * otherwise draw the store's answer in its first client render, over the
 * anonymous HTML it was sent: a hydration mismatch Vue does not repair in
 * production, which left the heart an outline for good. After mount it
 * is an ordinary patch. The same shape as the session's after-hydration
 * accessor: the server's state until mounted.
 *
 * The session itself arrives on the client once the page has resolved
 * (nuxt-auth-utils `ready`), and a heart can be clicked before that. A
 * click then waits for the session (the heart shows it is busy) and only
 * then decides; a signed-in shopper is never told to sign in.
 *
 * A favourite is created by product and deleted by its own id, so the
 * button says which one it holds (`favouriteId`, `null` for none yet);
 * `toggle` does the other. A guest gets "sign in first" and no request.
 * One request at a time (`isLoading`). The user store follows the
 * server's answer, and `onDeleted` tells the drawing the product's
 * favourite went (the favourites lists drop its card). A failure is one toast with
 * Django's reason, behind the headline `t('error_occurred')`.
 *
 * Except when the server says the shopper already has what they asked for:
 * `already_favourited` on an add (the heart showed the guest's state, or
 * another tab saved it) and a 404 on a removal (the favourite is gone).
 * The store then follows the server instead and the shopper gets the toast
 * of the change they wanted, not an error. The add leaves the product a
 * favourite whose id we do not know (`FAVOURITE_ID_UNKNOWN`): its heart is
 * pressed, as the server says, and a removal asks for the id first
 * (`resolveFavouriteId`), the one way to remove whatever the heart knew.
 *
 * Nothing is written after an await if the account changed meanwhile
 * (`favouriteSession`): an answer for a shopper who signed out never
 * lands in the next shopper's session.
 */
export function useProductFavouriteToggle(options: {
  productId: () => number
  userId: () => number | null | undefined
  favouriteId: () => FavouriteId | null | undefined
  t: ReturnType<typeof useI18n>['t']
  /** The product's favourite is gone (the favourites lists drop its card). */
  onDeleted: () => void
}) {
  const { t } = options
  const toast = useToast()
  const { notify } = useApiError()
  const { loggedIn, ready } = useUserSession()
  const userStore = useUserStore()
  const { addFavouriteProduct, markFavouriteProduct, removeFavouriteProduct, lookUpFavourites, resolveFavouriteId } = userStore
  const favouritesEnabled = useStoreFeature('favourites')

  const isLoading = ref(false)
  const mounted = useMounted()

  /** The favourite the heart draws: the guest's until it has mounted (see above). */
  const drawnFavouriteId = computed(() => (mounted.value ? options.favouriteId() : null))

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
    if (isLoading.value) {
      return
    }

    isLoading.value = true
    if (!ready.value) {
      await until(ready).toBe(true)
      // The caller's `userId` follows the session on its next render.
      await nextTick()
    }
    if (!loggedIn.value || !options.userId()) {
      isLoading.value = false
      toast.add({
        title: t('not_authenticated'),
        color: 'error',
      })
      return
    }

    const productId = options.productId()
    const favouriteId = options.favouriteId()
    const askedIn = userStore.favouriteSession()
    /** Whether the shopper who clicked is still the one signed in. */
    const sameSession = () => userStore.favouriteSession() === askedIn
    // The favourite a removal deletes, once known.
    let removing: number | undefined
    try {
      if (!favouriteId) {
        const favourite = await $api('/api/products/favourites', {
          method: 'POST',
          body: {
            product: productId,
          },
        })
        if (!sameSession()) return
        addFavouriteProduct(favourite)
        announce('added')
      }
      else {
        removing = favouriteId === FAVOURITE_ID_UNKNOWN ? await resolveFavouriteId(productId) : favouriteId
        if (!sameSession()) return
        // `undefined`: the server holds no favourite to delete any more.
        if (removing !== undefined) {
          await $api(`/api/products/favourites/${removing}`, { method: 'DELETE' })
          if (!sameSession()) return
        }
        options.onDeleted()
        removeFavouriteProduct(productId)
        announce('removed')
      }
    }
    catch (error) {
      if (!sameSession()) return
      const { code, status } = describeApiError(error)
      if (!favouriteId && code === 'already_favourited') {
        markFavouriteProduct(productId)
        announce('added')
        return
      }
      if (removing !== undefined && status === 404) {
        options.onDeleted()
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

  return { isLoading, drawnFavouriteId, toggle }
}
