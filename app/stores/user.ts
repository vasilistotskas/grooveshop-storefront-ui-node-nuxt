export const useUserStore = defineStore('user', () => {
  const account = ref<UserDetails | null>(null)
  const favouriteProductIds = ref<Map<number, number>>(new Map())
  const blogLikedPosts = ref<number[]>([])
  const blogLikedComments = ref<number[]>([])

  const getFavouriteIdByProductId = (productId: number) => {
    const favouriteId = favouriteProductIds.value.get(productId)
    return favouriteId
  }

  const clearAccountState = () => {
    favouriteProductIds.value.clear()
    blogLikedPosts.value = []
    blogLikedComments.value = []
  }

  const addFavouriteProduct = (favourite: CreateProductFavouriteResponse) => {
    favouriteProductIds.value.set(favourite.product, favourite.id)
  }

  const removeFavouriteProduct = (productId: number) => {
    favouriteProductIds.value.delete(productId)
  }

  const updateFavouriteProducts = (favourites: GetProductFavouritesByProductsResponse) => {
    favourites.forEach((favourite) => {
      favouriteProductIds.value.set(favourite.productId, favourite.id)
    })
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
      console.error('Failed to setup account:', err)
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
    removeFavouriteProduct,
    updateFavouriteProducts,
    blogPostLiked,
    blogCommentLiked,
    updateLikedPosts,
    updateLikedComments,
    addLikedPost,
    removeLikedPost,
    addLikedComment,
    removeLikedComment,
  }
})
