import type { IFetchError } from 'ofetch'
import type { ProductQuery } from '~/types/product/product'
import type { Pagination } from '~/types/pagination'
import type { BlogAuthor } from '~/types/blog/author'

interface ErrorRecord {
	authors: IFetchError | null
	author: IFetchError | null
}

interface PendingRecord {
	authors: boolean
	author: boolean
}

const errorsFactory = (): ErrorRecord => ({
	authors: null,
	author: null
})

const pendingFactory = (): PendingRecord => ({
	authors: false,
	author: false
})

export const useBlogAuthorStore = defineStore('blogAuthor', () => {
	const authors = ref<Pagination<BlogAuthor> | null>(null)
	const author = ref<BlogAuthor | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getBlogAuthorById = (id: number): BlogAuthor | null => {
		return authors.value?.results?.find((author) => author.id === id) ?? null
	}

	async function fetchBlogAuthors({ offset, limit, ordering }: ProductQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: authorsError,
			pending: authorsPending,
			refresh
		} = await useFetch<Pagination<BlogAuthor>>(`/api/blog/authors`, {
			method: 'get',
			params: {
				offset,
				limit,
				ordering
			}
		})
		authors.value = data.value
		error.value.authors = authorsError.value
		pending.value.authors = authorsPending.value

		return {
			data,
			error: authorsError,
			pending: authorsPending,
			refresh
		}
	}

	async function fetchBlogAuthor(authorId: string | number) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: authorError,
			pending: authorPending,
			refresh
		} = await useFetch<BlogAuthor>(`/api/blog/authors/${authorId}`, {
			method: 'get'
		})
		author.value = data.value
		error.value.author = authorError.value
		pending.value.author = authorPending.value

		return {
			data,
			error: authorError,
			pending: authorPending,
			refresh
		}
	}

	return {
		authors,
		author,
		pending,
		error,
		getBlogAuthorById,
		fetchBlogAuthors,
		fetchBlogAuthor
	}
})
