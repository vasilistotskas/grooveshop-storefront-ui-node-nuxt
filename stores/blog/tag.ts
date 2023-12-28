import type { IFetchError } from 'ofetch'
import type { Pagination } from '~/types/pagination'
import type { BlogTag, BlogTagQuery } from '~/types/blog/tag'

interface ErrorRecord {
	tags: IFetchError | null
	tag: IFetchError | null
}

interface PendingRecord {
	tags: boolean
	tag: boolean
}

const errorsFactory = (): ErrorRecord => ({
	tags: null,
	tag: null
})

const pendingFactory = (): PendingRecord => ({
	tags: false,
	tag: false
})

export const useBlogTagStore = defineStore('blogTag', () => {
	const tags = ref<BlogTag[] | null>(null)
	const tag = ref<BlogTag | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getBlogTagById = (id: number): BlogTag | null => {
		return tags.value?.find((tag) => tag.id === id) ?? null
	}

	async function fetchBlogTags({ page, ordering, active, pagination }: BlogTagQuery) {
		if (process.prerender) {
			return
		}

		const {
			data,
			error: tagsError,
			pending: tagsPending,
			refresh
		} = await useFetch<BlogTag[]>(`/api/blog/tags`, {
			method: 'get',
			params: {
				page,
				ordering,
				active,
				pagination
			}
		})
		tags.value = data.value
		error.value.tags = tagsError.value
		pending.value.tags = tagsPending.value

		return {
			data,
			error: tagsError,
			pending: tagsPending,
			refresh
		}
	}

	async function fetchBlogTag(tagId: string | number) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: tagError,
			pending: tagPending,
			refresh
		} = await useFetch<BlogTag>(`/api/blog/tags/${tagId}`, {
			method: 'get'
		})
		tag.value = data.value
		error.value.tag = tagError.value
		pending.value.tag = tagPending.value

		return {
			data,
			error: tagError,
			pending: tagPending,
			refresh
		}
	}

	return {
		tags,
		tag,
		pending,
		error,
		getBlogTagById,
		fetchBlogTags,
		fetchBlogTag
	}
})
