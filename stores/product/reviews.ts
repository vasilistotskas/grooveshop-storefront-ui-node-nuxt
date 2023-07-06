import { FetchError } from 'ofetch'
import { Pagination } from '~/zod/pagination/pagination'
import {
	Review,
	ReviewCreateQuery,
	ReviewCreateRequest,
	ReviewPutRequest,
	ReviewQuery,
	ReviewUserHadReviewedRequest
} from '~/zod/product/review'

interface ErrorRecord {
	reviews: FetchError | null
	userHadReviewed: FetchError | null
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

export interface ReviewsState {
	reviews: Pagination<Review> | null
	userHadReviewed: boolean | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useReviewsStore = defineStore({
	id: 'product-reviews',
	state: (): ReviewsState => ({
		reviews: null,
		userHadReviewed: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getReviewById:
			(state) =>
			(id: number): Review | null => {
				return state.reviews?.results?.find((review) => review.id === id) ?? null
			}
	},
	actions: {
		async fetchReviews({ productId, userId, page, ordering, expand }: ReviewQuery) {
			try {
				const {
					data: reviews,
					error,
					pending
				} = await useFetch(`/api/product-reviews`, {
					method: 'get',
					params: {
						productId,
						userId,
						page,
						ordering,
						expand
					}
				})
				this.reviews = reviews.value
				this.error.reviews = error.value
				this.pending.reviews = pending.value
			} catch (error) {
				this.error.reviews = error as FetchError
			}
		},
		async fetchUserToProductReview({ productId, userId, expand }: ReviewQuery) {
			try {
				const {
					data: review,
					error,
					pending
				} = await useFetch(`/api/product-reviews`, {
					method: 'get',
					params: {
						productId,
						userId,
						expand
					}
				})
				if (review.value?.results) {
					return review.value.results[0]
				}
				this.error.reviews = error.value
				this.pending.reviews = pending.value
			} catch (error) {
				this.error.reviews = error as FetchError
			}
		},
		async fetchUserHadReviewed({ product, user }: ReviewUserHadReviewedRequest) {
			try {
				const {
					data: userHadReviewed,
					error,
					pending
				} = await useFetch(`/api/product-reviews/user-had-reviewed`, {
					method: 'post',
					body: {
						product,
						user
					}
				})
				this.userHadReviewed = userHadReviewed.value
				this.error.userHadReviewed = error.value
				this.pending.userHadReviewed = pending.value
			} catch (error) {
				this.error.userHadReviewed = error as FetchError
			}
		},
		async addReview(body: ReviewCreateRequest, params: ReviewCreateQuery) {
			try {
				const {
					data: review,
					error,
					pending
				} = await useFetch(`/api/product-reviews`, {
					method: 'post',
					body,
					params
				})
				if (
					review.value &&
					this.reviews &&
					this.reviews?.results &&
					this.reviews?.results?.length < this.reviews?.pageSize
				) {
					this.reviews?.results?.push(review.value)
				}
				this.error.reviews = error.value
				this.pending.reviews = pending.value
			} catch (error) {
				this.error.reviews = error as FetchError
			}
		},
		async deleteReview(id: number) {
			try {
				const { error, pending } = await useFetch(`/api/product-reviews/${id}`, {
					method: 'delete'
				})
				const index = this.reviews?.results?.findIndex((review) => review.id === id)
				// If current review in results listing delete it
				if (index !== undefined && index !== -1) {
					this.reviews?.results?.splice(index, 1)
				}
				this.error.reviews = error.value
				this.pending.reviews = pending.value
			} catch (error) {
				this.error.reviews = error as FetchError
			}
		},
		async updateReview(id: number, body: ReviewPutRequest) {
			try {
				const {
					data: review,
					error,
					pending
				} = await useFetch(`/api/product-reviews/${id}`, {
					method: 'put',
					body: JSON.stringify(body)
				})
				if (review.value && this.reviews?.results) {
					const index = this.reviews?.results?.findIndex((review) => review.id === id)
					// If current review in results listing update it
					if (index !== -1) {
						this.reviews.results[index] = {
							comment: review.value.comment,
							createdAt: review.value.createdAt,
							id: review.value.id,
							isPublished: review.value.isPublished,
							publishedAt: review.value.publishedAt,
							rate: review.value.rate,
							status: review.value.status,
							updatedAt: review.value.updatedAt,
							uuid: review.value.uuid,
							product: this.reviews?.results[index].product,
							user: this.reviews?.results[index].user
						}
					}
				}
				this.error.reviews = error.value
				this.pending.reviews = pending.value
			} catch (error) {
				this.error.reviews = error as FetchError
			}
		}
	}
})
