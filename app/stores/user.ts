export const useUserStore = defineStore('user', () => {
  const favouriteProducts = ref<ProductFavourite[]>([])
  const blogLikedPosts = ref<number[]>([])
  const blogLikedComments = ref<number[]>([])

  const getFavouriteByProductId = (productId: number) => {
    return favouriteProducts.value.find(
      favourite => getEntityId(favourite.product) === productId,
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
      favourite => getEntityId(favourite.product) !== productId,
    )
  }

  const updateFavouriteProducts = (favourites: ProductFavourite[]) => {
    const updatedFavourites = favourites.filter((favourite) => {
      return !favouriteProducts.value.some(
        f => getEntityId(f.product) === getEntityId(favourite.product),
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

  return {
    favouriteProducts,
    blogLikedPosts,
    blogLikedComments,
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
