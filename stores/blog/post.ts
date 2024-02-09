import type { IFetchError } from 'ofetch'
import type { Pagination } from '~/types/pagination'
import type { BlogPost, BlogPostQuery } from '~/types/blog/post'

interface ErrorRecord {
	posts: IFetchError | null
	post: IFetchError | null
}

interface PendingRecord {
	posts: boolean
	post: boolean
}

const errorsFactory = (): ErrorRecord => ({
	posts: null,
	post: null
})

const pendingFactory = (): PendingRecord => ({
	posts: false,
	post: false
})

export const useBlogPostStore = defineStore('blogPost', () => {
	const posts = ref<Pagination<BlogPost> | null>(null)
	const post = ref<BlogPost | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getBlogPostById = (id: number): BlogPost | null => {
		return posts.value?.results?.find((post) => post.id === id) ?? null
	}

	async function fetchBlogPosts({ page, ordering, expand }: BlogPostQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: postsError,
			pending: postsPending,
			refresh
		} = await useFetch<Pagination<BlogPost>>(`/api/blog/posts`, {
			method: 'get',
			params: {
				page,
				ordering,
				expand
			}
		})
		posts.value = data.value
		error.value.posts = postsError.value
		pending.value.posts = postsPending.value

		return {
			data,
			error: postsError,
			pending: postsPending,
			refresh
		}
	}

	async function fetchBlogPost(postId: string | number, expand?: string) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: postError,
			pending: postPending,
			refresh
		} = await useFetch<BlogPost>(`/api/blog/posts/${postId}`, {
			method: 'get',
			params: {
				expand
			}
		})
		post.value = data.value
		error.value.post = postError.value
		pending.value.post = postPending.value

		return {
			data,
			error: postError,
			pending: postPending,
			refresh
		}
	}

	return {
		posts,
		post,
		pending,
		error,
		getBlogPostById,
		fetchBlogPosts,
		fetchBlogPost
	}
})
