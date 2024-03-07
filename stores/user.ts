import type { BlogComment } from '~/types/blog/comment'
import type { Order } from '~/types/order/order'
import type { ProductFavourite } from '~/types/product/favourite'
import type { ProductReview } from '~/types/product/review'
import type { UserAccountDetails } from '~/types/user/account/details'
import type { UserAddress } from '~/types/user/address'

export const useUserStore = defineStore('user', () => {
	const favouriteProducts = ref<ProductFavourite[]>([])
	const productReviews = ref<ProductReview[]>([])
	const orders = ref<Order[]>([])
	const userAddresses = ref<UserAddress[]>([])
	const blogPostComments = ref<BlogComment[]>([])
	const blogLikedPosts = ref<number[]>([])
	const blogLikedComments = ref<number[]>([])

	const getUserProductFavourite = (productId: number): ProductFavourite | null => {
		return (
			favouriteProducts.value?.find((favourite) => {
				if (typeof favourite.product === 'number') {
					return favourite.product === productId
				} else {
					return favourite.product.id === productId
				}
			}) || null
		)
	}

	const getBlogPostLiked = (id: number): boolean => {
		return blogLikedPosts.value?.includes(id) || false
	}

	const getBlogCommentLiked = (id: number): boolean => {
		return blogLikedComments.value?.includes(id) || false
	}

	const getUserHasCommentedBlogPost = (postId: number): boolean => {
		return (
			blogPostComments.value?.some((comment) => {
				if (typeof comment.post === 'number') {
					return comment.post === postId
				} else {
					return comment.post.id === postId
				}
			}) || false
		)
	}

	function setAccountState(data: UserAccountDetails) {
		favouriteProducts.value = data.favouriteProducts || []
		productReviews.value = data.productReviews || []
		orders.value = data.orders || []
		userAddresses.value = data.userAddresses || []
		blogPostComments.value = data.blogPostComments || []
		blogLikedPosts.value = data.blogLikedPosts || []
		blogLikedComments.value = data.blogLikedComments || []
	}

	function cleanAccountState() {
		favouriteProducts.value = []
		productReviews.value = []
		orders.value = []
		userAddresses.value = []
		blogPostComments.value = []
		blogLikedPosts.value = []
		blogLikedComments.value = []
	}

	function deleteAddress(id: number) {
		const index = userAddresses.value?.findIndex((address) => address.id === id)
		if (index !== undefined && index !== -1) {
			userAddresses.value?.splice(index, 1)
		}
	}

	function sortAddresses(by: keyof UserAddress = 'isMain') {
		userAddresses.value?.sort((a, b) => {
			if (a[by] === b[by]) {
				return 0
			}
			return a[by] ? -1 : 1
		})
	}

	function setMainAddress(id: number) {
		const index = userAddresses.value?.findIndex((address) => address.id === id)
		if (index !== undefined && index !== -1) {
			userAddresses.value.forEach((address) => {
				address.isMain = false
			})
			userAddresses.value[index].isMain = true
		}
		sortAddresses()
	}

	function addReview(review: ProductReview) {
		productReviews.value.push(review)
	}

	function updateReview(id: number, review: ProductReview) {
		const index = productReviews.value?.findIndex((r) => r.id === id)
		if (index !== undefined && index !== -1) {
			productReviews.value[index] = review
		}
	}

	function deleteReview(id: number) {
		const index = productReviews.value?.findIndex((r) => r.id === id)
		if (index !== undefined && index !== -1) {
			productReviews.value.splice(index, 1)
		}
	}

	function addOrder(order: Order) {
		orders.value.push(order)
	}

	return {
		favouriteProducts,
		productReviews,
		orders,
		userAddresses,
		blogPostComments,
		blogLikedPosts,
		blogLikedComments,
		addReview,
		updateReview,
		deleteReview,
		deleteAddress,
		setMainAddress,
		addOrder,
		setAccountState,
		cleanAccountState,
		getUserProductFavourite,
		getUserHasCommentedBlogPost,
		getBlogPostLiked,
		getBlogCommentLiked
	}
})
