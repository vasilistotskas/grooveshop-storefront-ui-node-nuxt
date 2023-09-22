import { IFetchError } from 'ofetch'
import { SearchProduct, SearchQuery, SearchResults } from '~/types/search'

interface ErrorRecord {
	results: IFetchError | null
}

interface PendingRecord {
	results: boolean
}

const errorsFactory = (): ErrorRecord => ({
	results: null
})

const pendingFactory = (): PendingRecord => ({
	results: false
})

interface SearchState {
	results: SearchResults | null
	storage: string[]
	pending: PendingRecord
	error: ErrorRecord
}

export const useSearchStore = defineStore({
	id: 'search',
	state: (): SearchState => ({
		results: null,
		storage: [],
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		totalCount: (state) => {
			const totalProductsCount = state.results?.products?.resultCount || 0
			const totalProductCategoriesCount = 0
			return totalProductsCount + totalProductCategoriesCount
		},
		resultsEmpty: (state): boolean => {
			if (!state.results) {
				return true
			}
			const totalProductsCount = state.results?.products?.resultCount || 0
			const totalProductCategoriesCount =
				state.results?.productCategories?.resultCount || 0
			return totalProductsCount + totalProductCategoriesCount === 0
		},
		productSearchItems: (state): SearchProduct[] => {
			return state.results?.products?.results || []
		},
		productHeadlines: (state): Record<string, string> => {
			return state.results?.products?.headlines || {}
		},
		productCategorySearchItems: (state) => {
			return state.results?.productCategories?.results || []
		}
	},
	actions: {
		async search(query: SearchQuery) {
			this.pending.results = true

			if (!query.query) {
				return
			}

			try {
				const {
					data: results,
					error,
					pending
				} = await useFetch<SearchResults>(`/api/search`, {
					method: 'get',
					params: {
						query: query.query
					}
				})
				this.results = results.value
				this.error.results = error.value
				this.pending.results = pending.value

				if (process.client && !this.resultsEmpty) {
					const value = useLocalStorage(`$search:${query.query}`, query.query).value
					if (!this.storage.includes(value)) {
						this.storage.push(value)
					}
				}
			} catch (error) {
				this.error.results = error as IFetchError
			}
		},
		reset() {
			this.results = null
			this.pending = pendingFactory()
			this.error = errorsFactory()
		}
	}
})
