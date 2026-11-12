export const useUserStore = defineStore('user', () => {
  const account = ref<UserDetails | null>(null)
  const favouriteProductIds = ref<Record<number, FavouriteId>>({})
  const blogLikedPosts = ref<number[]>([])
  const blogLikedComments = ref<number[]>([])

  const getFavouriteIdByProductId = (productId: number) => {
    return favouriteProductIds.value[productId]
  }

  // The favourite lookup's bookkeeping, private to this store instance (one
  // per app, so never shared between requests) and never serialised:
  // `known` holds the products whose state the server has told us this
  // session, `pending` the ones waiting for the next batch, `changes` the
  // click that last changed each product and `latestLookup` the lookup that
  // last asked about it, so an answer that was already on its way when a
  // click or a newer question came cannot undo them. `session` counts the
  // account resets: an answer to a question asked in an earlier session
  // (the shopper signed out, maybe another signed in) is dropped whole.
  const known = new Set<number>()
  const pending = new Set<number>()
  let batchScheduled = false
  let clicks = 0
  const changes = new Map<number, number>()
  let lookups = 0
  const latestLookup = new Map<number, number>()
  let session = 0

  const clearAccountState = () => {
    account.value = null
    favouriteProductIds.value = {}
    blogLikedPosts.value = []
    blogLikedComments.value = []
    known.clear()
    pending.clear()
    changes.clear()
    latestLookup.clear()
    session++
  }

  /**
   * The session an asynchronous write was asked in: whoever writes into
   * the store after an await compares it with `favouriteSession()` then and
   * writes nothing if they differ.
   */
  const favouriteSession = () => session

  const setFavourite = (productId: number, favouriteId: FavouriteId | undefined) => {
    if (favouriteId === undefined) {
      const { [productId]: _removed, ...rest } = favouriteProductIds.value
      favouriteProductIds.value = rest
    }
    else {
      favouriteProductIds.value = { ...favouriteProductIds.value, [productId]: favouriteId }
    }
    known.add(productId)
  }

  /** A heart the shopper switched on, from the server's answer. */
  const addFavouriteProduct = (favourite: CreateProductFavouriteResponse) => {
    changes.set(favourite.product, ++clicks)
    setFavourite(favourite.product, favourite.id)
  }

  /** A heart the shopper switched on that the server already held (`already_favourited`): pressed, its id asked for when it is removed. */
  const markFavouriteProduct = (productId: number) => {
    changes.set(productId, ++clicks)
    setFavourite(productId, FAVOURITE_ID_UNKNOWN)
  }

  /** A heart the shopper switched off. */
  const removeFavouriteProduct = (productId: number) => {
    changes.set(productId, ++clicks)
    setFavourite(productId, undefined)
  }

  /**
   * Favourites the caller holds already (the favourites page's own list).
   * Only the signed-in shopper's: a list that was on its way when the
   * account changed belongs to someone else.
   */
  const updateFavouriteProducts = (favourites: GetProductFavouritesByProductsResponse) => {
    const owner = useUserSession().user.value?.id
    favourites
      .filter(favourite => favourite.userId === owner)
      .forEach(favourite => setFavourite(favourite.productId, favourite.id))
  }

  /**
   * Asks the server about `productIds` and keeps what it answers, a product
   * with no favourite included, except for a product a click or a newer
   * question changed since, and nothing at all if the session changed.
   * Answers the favourites by product, or `undefined` for a dropped answer.
   */
  const ask = async (productIds: number[]): Promise<Map<number, number> | undefined> => {
    const askedIn = session
    const lookup = ++lookups
    const askedAt = clicks
    productIds.forEach(productId => latestLookup.set(productId, lookup))
    const favourites = await $api('/api/products/favourites/favourites-by-products', {
      method: 'POST',
      body: { productIds },
    })
    if (askedIn !== session) return undefined
    const answered = new Map(favourites.map(favourite => [favourite.productId, favourite.id]))
    for (const productId of productIds) {
      if (latestLookup.get(productId) !== lookup) continue
      if ((changes.get(productId) ?? 0) > askedAt) continue
      setFavourite(productId, answered.get(productId))
    }
    return answered
  }

  /**
   * The id of the product's favourite, asked of the server now: for a
   * removal of a favourite whose id we never had (`FAVOURITE_ID_UNKNOWN`).
   * `undefined` when it has none any more, or when the session changed;
   * throws when the server cannot be asked.
   */
  const resolveFavouriteId = async (productId: number): Promise<number | undefined> =>
    (await ask([productId]))?.get(productId)

  /**
   * Asks the server which of `productIds` the shopper's favourites hold and
   * keeps the answer, a product with no favourite included. Every product
   * a page draws a heart for is asked about at most once a session: the
   * ids registered in one tick go in ONE request (a hundred at most, the
   * Django view's limit, so more are split), and a product already known
   * or already waiting is skipped.
   *
   * Signed-in and in the browser only: pages are rendered and cached
   * anonymously, so a heart draws as the guest's until it mounts and asks.
   * A failed lookup is logged and forgotten, so the next heart that mounts
   * asks again; the hearts it concerned keep the guest's state.
   */
  const lookUpFavourites = (productIds: readonly number[]) => {
    const { loggedIn } = useUserSession()
    if (import.meta.server || !loggedIn.value) return
    for (const productId of productIds) {
      if (!known.has(productId)) pending.add(productId)
    }
    if (pending.size === 0 || batchScheduled) return
    batchScheduled = true
    queueMicrotask(() => {
      batchScheduled = false
      const ids = [...pending]
      pending.clear()
      for (let start = 0; start < ids.length; start += FAVOURITES_LOOKUP_MAX_IDS) {
        void lookUpBatch(ids.slice(start, start + FAVOURITES_LOOKUP_MAX_IDS))
      }
    })
  }

  const lookUpBatch = async (productIds: number[]) => {
    productIds.forEach(productId => known.add(productId))
    const askedIn = session
    try {
      await ask(productIds)
    }
    catch (error) {
      // Not in a later session: its `known` is its own.
      if (askedIn === session) productIds.forEach(productId => known.delete(productId))
      log.error({ action: 'favourite:lookup', error })
    }
  }

  const blogPostLiked = (postId: number) => {
    return blogLikedPosts.value.includes(postId)
  }

  const blogCommentLiked = (commentId: number) => {
    return blogLikedComments.value.includes(commentId)
  }

  const updateLikedPosts = (likedPosts: number[]) => {
    blogLikedPosts.value = [
      ...new Set([...blogLikedPosts.value, ...likedPosts]),
    ]
  }

  const updateLikedComments = (likedComments: number[]) => {
    blogLikedComments.value = [
      ...new Set([...blogLikedComments.value, ...likedComments]),
    ]
  }

  /**
   * Which of `commentIds` the signed-in reader has liked, merged into
   * `blogLikedComments`. The like state only decorates comments already
   * on screen, so a failed request leaves them unmarked and is logged
   * rather than toasted.
   */
  const loadLikedComments = async (commentIds: number[]) => {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value || commentIds.length === 0) return

    try {
      const { likedCommentIds } = await $api('/api/blog/comments/liked-comments', {
        method: 'POST',
        body: { commentIds },
      })
      updateLikedComments(likedCommentIds)
    }
    catch (error) {
      log.error({ action: 'blog:likedComments', error })
    }
  }

  const addLikedPost = (postId: number) => {
    blogLikedPosts.value = [...blogLikedPosts.value, postId]
  }

  const removeLikedPost = (postId: number) => {
    blogLikedPosts.value = blogLikedPosts.value.filter(id => id !== postId)
  }

  const addLikedComment = (commentId: number) => {
    blogLikedComments.value = [...blogLikedComments.value, commentId]
  }

  const removeLikedComment = (commentId: number) => {
    blogLikedComments.value = blogLikedComments.value.filter(
      id => id !== commentId,
    )
  }

  const setupAccount = async () => {
    const { loggedIn, user } = useUserSession()
    if (!loggedIn.value || !user.value) {
      return
    }

    try {
      if (!user.value || !user.value.id) {
        throw new Error('User is not logged in')
      }

      const { getUserAccount } = useAllAuthAccount()
      const data = await getUserAccount(user.value.id)

      if (data) {
        account.value = data
      }
    }
    catch (err) {
      log.error({ action: 'user:setupAccount', error: err })
    }
  }

  return {
    account,
    favouriteProductIds,
    blogLikedPosts,
    blogLikedComments,
    setupAccount,
    clearAccountState,
    getFavouriteIdByProductId,
    addFavouriteProduct,
    markFavouriteProduct,
    removeFavouriteProduct,
    resolveFavouriteId,
    favouriteSession,
    updateFavouriteProducts,
    lookUpFavourites,
    blogPostLiked,
    blogCommentLiked,
    updateLikedPosts,
    updateLikedComments,
    loadLikedComments,
    addLikedPost,
    removeLikedPost,
    addLikedComment,
    removeLikedComment,
  }
})
