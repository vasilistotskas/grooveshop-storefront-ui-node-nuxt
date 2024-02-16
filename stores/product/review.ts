import type { IFetchError } from 'ofetch'
import type { Pagination } from '~/types/pagination'
import type {
	ProductReview,
	ProductReviewCreateQuery,
	ProductReviewCreateBody,
	ProductReviewPutBody,
	ProductReviewQuery,
	ProductReviewUserHadReviewedBody
} from '~/types/product/review'

interface ErrorRecord {
	reviews: IFetchError | null
	userHadReviewed: IFetchError | null
}

interface PendingRecord {
	reviews: boolean
	userHadReviewed: boolean
}

const errorsFactory = (): ErrorRecord => ({
	reviews: null,
	userHadReviewed: null
})

const pendingFactory = (): PendingRecord => ({
	reviews: false,
	userHadReviewed: false
})

export const useProductReviewStore = defineStore('productReview', () => {
	const reviews = ref<Pagination<ProductReview> | null>(null)
	const userHadReviewed = ref<boolean | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getReviewById = (id: number): ProductReview | null => {
		return reviews.value?.results?.find((review) => review.id === id) ?? null
	}

	async function fetchReviews({
		productId,
		userId,
		page,
		ordering,
		expand,
		status
	}: ProductReviewQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		} = await useFetch<Pagination<ProductReview>>(`/api/products/reviews`, {
			method: 'get',
			params: {
				productId,
				userId,
				page,
				ordering,
				expand,
				status
			}
		})
		reviews.value = data.value
		error.value.reviews = reviewsError.value
		pending.value.reviews = reviewsPending.value

		return {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		}
	}

	async function fetchUserToProductReview({
		productId,
		userId,
		expand,
		status
	}: ProductReviewQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		} = await useFetch<Pagination<ProductReview>>(`/api/products/reviews`, {
			method: 'get',
			params: {
				productId,
				userId,
				expand,
				status
			}
		})
		let userToProductReview = null
		if (data.value?.results) {
			userToProductReview = data.value.results[0]
		}
		error.value.reviews = reviewsError.value
		pending.value.reviews = reviewsPending.value

		return {
			data: userToProductReview,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		}
	}

	async function fetchUserHadReviewed({
		product,
		user
	}: ProductReviewUserHadReviewedBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: userHadReviewedError,
			pending: userHadReviewedPending,
			refresh
		} = await useFetch<boolean>(`/api/products/reviews/user-had-reviewed`, {
			method: 'post',
			body: {
				product,
				user
			}
		})
		userHadReviewed.value = data.value
		error.value.userHadReviewed = userHadReviewedError.value
		pending.value.userHadReviewed = userHadReviewedPending.value

		return {
			data,
			error: userHadReviewedError,
			pending: userHadReviewedPending,
			refresh
		}
	}

	async function createReview(
		body: ProductReviewCreateBody,
		params: ProductReviewCreateQuery
	) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		} = await useFetch<ProductReview>(`/api/products/reviews`, {
			method: 'post',
			body,
			params
		})

		if (
			data.value &&
			reviews.value &&
			reviews.value?.results &&
			reviews.value?.results?.length < reviews.value?.pageSize
		) {
			reviews?.value?.results?.push(data.value)
		}

		error.value.reviews = reviewsError.value
		pending.value.reviews = reviewsPending.value

		return {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		}
	}

	async function updateReview(id: number, body: ProductReviewPutBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		} = await useFetch<ProductReview>(`/api/products/reviews/${id}`, {
			method: 'put',
			body
		})
		if (data.value && reviews.value?.results) {
			const index = reviews.value?.results?.findIndex((review) => review.id === id)
			if (index !== -1) {
				reviews.value.results[index] = {
					...data.value,
					product: reviews.value?.results[index].product,
					user: reviews.value?.results[index].user
				}
			}
		}
		error.value.reviews = reviewsError.value
		pending.value.reviews = reviewsPending.value

		return {
			data,
			error: reviewsError,
			pending: reviewsPending,
			refresh
		}
	}

	async function deleteReview(id: number) {
		if (process.prerender) {
			return
		}
		const {
			error: reviewsError,
			pending: reviewsPending,
			refresh
		} = await useFetch(`/api/products/reviews/${id}`, {
			method: 'delete'
		})

		const index = reviews.value?.results?.findIndex((review) => review.id === id)
		if (index !== undefined && index !== -1) {
			reviews.value?.results?.splice(index, 1)
		}
		error.value.reviews = reviewsError.value
		pending.value.reviews = reviewsPending.value

		return {
			error: reviewsError,
			pending: reviewsPending,
			refresh
		}
	}

	return {
		reviews,
		userHadReviewed,
		pending,
		error,
		getReviewById,
		fetchReviews,
		fetchUserToProductReview,
		fetchUserHadReviewed,
		createReview,
		deleteReview,
		updateReview
	}
})
