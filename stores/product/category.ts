import type { IFetchError } from 'ofetch'
import type { Category } from '~/types/product/category'
import type { ProductQuery } from '~/types/product/product'
import type { Pagination } from '~/types/pagination/pagination'

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

export const useProductCategoryStore = defineStore('productCategory', () => {
	const categories = ref<Pagination<Category> | null>(null)
	const category = ref<Category | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getCategoryById = (id: number): Category | null => {
		return categories.value?.results?.find((category) => category.id === id) ?? null
	}

	async function fetchCategories({ offset, limit, ordering }: ProductQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: categoriesError,
			pending: categoriesPending,
			refresh
		} = await useFetch<Pagination<Category>>(`/api/product-categories`, {
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

	async function fetchCategory(categoryId: string | number) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: categoryError,
			pending: categoryPending,
			refresh
		} = await useFetch<Category>(`/api/product-category/${categoryId}`, {
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
		getCategoryById,
		fetchCategories,
		fetchCategory
	}
})
