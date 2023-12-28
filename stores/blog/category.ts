import type { IFetchError } from 'ofetch'
import type { ProductQuery } from '~/types/product/product'
import type { Pagination } from '~/types/pagination'
import type { BlogCategory } from '~/types/blog/category'

interface ErrorRecord {
	categories: IFetchError | null
	category: IFetchError | null
}

interface PendingRecord {
	categories: boolean
	category: boolean
}

const errorsFactory = (): ErrorRecord => ({
	categories: null,
	category: null
})

const pendingFactory = (): PendingRecord => ({
	categories: false,
	category: false
})

export const useBlogCategoryStore = defineStore('blogCategory', () => {
	const categories = ref<Pagination<BlogCategory> | null>(null)
	const category = ref<BlogCategory | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getBlogCategoryById = (id: number): BlogCategory | null => {
		return categories.value?.results?.find((category) => category.id === id) ?? null
	}

	async function fetchBlogCategories({ offset, limit, ordering }: ProductQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: categoriesError,
			pending: categoriesPending,
			refresh
		} = await useFetch<Pagination<BlogCategory>>(`/api/blog/categories`, {
			method: 'get',
			params: {
				offset,
				limit,
				ordering
			}
		})
		categories.value = data.value
		error.value.categories = categoriesError.value
		pending.value.categories = categoriesPending.value

		return {
			data,
			error: categoriesError,
			pending: categoriesPending,
			refresh
		}
	}

	async function fetchBlogCategory(categoryId: string | number) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: categoryError,
			pending: categoryPending,
			refresh
		} = await useFetch<BlogCategory>(`/api/blog/categories/${categoryId}`, {
			method: 'get'
		})
		category.value = data.value
		error.value.category = categoryError.value
		pending.value.category = categoryPending.value

		return {
			data,
			error: categoryError,
			pending: categoryPending,
			refresh
		}
	}

	return {
		categories,
		category,
		pending,
		error,
		getBlogCategoryById,
		fetchBlogCategories,
		fetchBlogCategory
	}
})
