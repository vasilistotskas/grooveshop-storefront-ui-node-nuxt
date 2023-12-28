import type { IFetchError } from 'ofetch'
import type { Pagination } from '~/types/pagination'
import type {
	BlogComment,
	BlogCommentCreateBody,
	BlogCommentCreateQuery,
	BlogCommentQuery,
	BlogCommentUserHadCommentedBody,
	BlogCommentPutBody
} from '~/types/blog/comment'

interface ErrorRecord {
	comments: IFetchError | null
	userHadCommented: IFetchError | null
}

interface PendingRecord {
	comments: boolean
	userHadCommented: boolean
}

const errorsFactory = (): ErrorRecord => ({
	comments: null,
	userHadCommented: null
})

const pendingFactory = (): PendingRecord => ({
	comments: false,
	userHadCommented: false
})

export const useBlogCommentStore = defineStore('blogComment', () => {
	const comments = ref<Pagination<BlogComment> | null>(null)
	const userHadCommented = ref<boolean | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getBlogCommentById = (id: number): BlogComment | null => {
		return comments.value?.results?.find((comment) => comment.id === id) ?? null
	}

	async function fetchBlogComments({
		post,
		user,
		page,
		ordering,
		expand
	}: BlogCommentQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: commentsError,
			pending: commentsPending,
			refresh
		} = await useFetch<Pagination<BlogComment>>(`/api/blog/comments`, {
			method: 'get',
			params: {
				post,
				user,
				page,
				ordering,
				expand
			}
		})
		comments.value = data.value
		error.value.comments = commentsError.value
		pending.value.comments = commentsPending.value

		return {
			data,
			error: commentsError,
			pending: commentsPending,
			refresh
		}
	}

	async function fetchUserToBlogPostComment({ post, user, expand }: BlogCommentQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: userHadCommentedError,
			pending: userHadCommentedPending,
			refresh
		} = await useFetch<Pagination<BlogComment>>(`/api/blog/comments`, {
			method: 'get',
			params: {
				post,
				user,
				expand
			}
		})

		let userToProductComment = null
		if (data.value?.results) {
			userToProductComment = data.value.results[0]
		}
		error.value.userHadCommented = userHadCommentedError.value
		pending.value.userHadCommented = userHadCommentedPending.value

		return {
			data: userToProductComment,
			error: userHadCommentedError,
			pending: userHadCommentedPending,
			refresh
		}
	}

	async function fetchBlogUserHadCommented({
		post,
		user
	}: BlogCommentUserHadCommentedBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: userHadCommentedError,
			pending: userHadCommentedPending,
			refresh
		} = await useFetch<boolean>(`/api/blog/comments/user-had-commented`, {
			method: 'get',
			params: {
				post,
				user
			}
		})
		userHadCommented.value = data.value
		error.value.userHadCommented = userHadCommentedError.value
		pending.value.userHadCommented = userHadCommentedPending.value

		return {
			data,
			error: userHadCommentedError,
			pending: userHadCommentedPending,
			refresh
		}
	}

	async function createBlogComment(
		body: BlogCommentCreateBody,
		params: BlogCommentCreateQuery
	) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: blogCommentError,
			pending: blogCommentPending,
			refresh
		} = await useFetch<BlogComment>(`/api/blog/comments`, {
			method: 'post',
			body: {
				body,
				params
			}
		})

		if (
			data.value &&
			comments.value &&
			comments.value?.results &&
			comments.value?.results?.length < comments.value?.pageSize
		) {
			comments?.value?.results?.push(data.value)
		}

		error.value.comments = blogCommentError.value
		pending.value.comments = blogCommentPending.value

		return {
			data,
			error: blogCommentError,
			pending: blogCommentPending,
			refresh
		}
	}

	async function updateBlogComment(id: number, body: BlogCommentPutBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: blogCommentError,
			pending: blogCommentPending,
			refresh
		} = await useFetch<BlogComment>(`/api/blog/comments/${id}`, {
			method: 'put',
			body
		})

		if (data.value && comments.value?.results) {
			const index = comments.value?.results?.findIndex((comment) => comment.id === id)
			if (index !== -1) {
				comments.value.results[index] = {
					...data.value,
					post: comments.value?.results[index].post,
					user: comments.value?.results[index].user
				}
			}
		}

		error.value.comments = blogCommentError.value
		pending.value.comments = blogCommentPending.value

		return {
			data,
			error: blogCommentError,
			pending: blogCommentPending,
			refresh
		}
	}

	async function deleteBlogComment(id: number) {
		if (process.prerender) {
			return
		}
		const {
			error: blogCommentError,
			pending: blogCommentPending,
			refresh
		} = await useFetch(`/api/blog/comments/${id}`, {
			method: 'delete'
		})

		const index = comments.value?.results?.findIndex((comment) => comment.id === id)
		if (index !== undefined && index !== -1) {
			comments.value?.results?.splice(index, 1)
		}

		error.value.comments = blogCommentError.value
		pending.value.comments = blogCommentPending.value

		return {
			error: blogCommentError,
			pending: blogCommentPending,
			refresh
		}
	}

	return {
		comments,
		userHadCommented,
		pending,
		error,
		getBlogCommentById,
		fetchUserToBlogPostComment,
		fetchBlogUserHadCommented,
		createBlogComment,
		updateBlogComment,
		deleteBlogComment
	}
})
