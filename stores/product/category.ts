import { FetchError } from 'ofetch'
import { Category } from '~/types/product/category'
import { ProductQuery } from '~/types/product/product'
import { Pagination } from '~/types/pagination/pagination'

interface ErrorRecord {
	categories: FetchError | null
	category: FetchError | null
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

export interface CategoryState {
	categories: Pagination<Category> | null
	category: Category | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useCategoryStore = defineStore({
	id: 'product-category',
	state: (): CategoryState => ({
		categories: null,
		category: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getCategoryById: (state) => (id: number) => {
			return state.categories?.results?.find((category) => category.id === id)
		}
	},
	actions: {
		async fetchCategories({ offset, limit, ordering }: ProductQuery): Promise<void> {
			try {
				const {
					data: categories,
					error,
					pending
				} = await useFetch(`/api/product-categories`, {
					method: 'get',
					params: {
						offset,
						limit,
						ordering
					}
				})
				this.categories = categories.value
				this.error.categories = error.value
				this.pending.categories = pending.value
			} catch (error) {
				this.error.categories = error as FetchError
			}
		},
		async fetchCategory(categoryId: string | number): Promise<void> {
			try {
				const {
					data: category,
					error,
					pending
				} = await useFetch(`/api/product-category/${categoryId}`, {
					method: 'get'
				})
				this.category = category.value
				this.error.category = error.value
				this.pending.category = pending.value
			} catch (error) {
				this.error.category = error as FetchError
			}
		}
	}
})
