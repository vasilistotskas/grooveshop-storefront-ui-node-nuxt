export const useUserStore = defineStore('user', () => {
  const account = ref<UserAccount | null>(null)
  const favouriteProducts = ref<ProductFavourite[]>([])
  const blogLikedPosts = ref<number[]>([])
  const blogLikedComments = ref<number[]>([])

  const getFavouriteByProductId = (productId: number) => {
    return favouriteProducts.value.find(
      favourite => favourite.product.id === productId,
    )
  }

  const clearAccountState = () => {
    favouriteProducts.value = []
    blogLikedPosts.value = []
    blogLikedComments.value = []
  }

  const addFavouriteProduct = (favourite: ProductFavourite) => {
    favouriteProducts.value = [...favouriteProducts.value, favourite]
  }

  const removeFavouriteProduct = (productId: number) => {
    favouriteProducts.value = favouriteProducts.value.filter(
      favourite => favourite.product.id !== productId,
    )
  }

  const updateFavouriteProducts = (favourites: ProductFavourite[]) => {
    const updatedFavourites = favourites.filter((favourite) => {
      return !favouriteProducts.value.some(
        f => f.product === favourite.product,
      )
    })
    favouriteProducts.value = [...favouriteProducts.value, ...updatedFavourites]
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
    const { getUserAccount } = useAllAuthAccount()
    const { data } = await useAsyncData<UserAccount | null>(
      'userAccount',
      () => {
        if (!user.value || !user.value.id!) {
          throw new Error('User is not logged in')
        }
        return getUserAccount(user.value.id)
      },
    )
    if (data.value) {
      account.value = data.value
    }
  }

  return {
    account,
    favouriteProducts,
    blogLikedPosts,
    blogLikedComments,
    setupAccount,
    clearAccountState,
    getFavouriteByProductId,
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
