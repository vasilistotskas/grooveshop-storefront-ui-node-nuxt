import type { IFetchError } from 'ofetch'
import type { SearchQuery, SearchResults } from '~/types/search'

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

export const useSearchStore = defineStore('search', () => {
	const results = ref<SearchResults | null>(null)
	const storage = ref<string[]>([])
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const totalCount = computed(() => {
		const totalProductsCount = results.value?.products?.resultCount || 0
		const totalProductCategoriesCount = 0
		return totalProductsCount + totalProductCategoriesCount
	})

	const resultsEmpty = computed(() => {
		if (!results.value) {
			return true
		}
		const totalProductsCount = results.value?.products?.resultCount || 0
		const totalProductCategoriesCount = results.value?.productCategories?.resultCount || 0
		return totalProductsCount + totalProductCategoriesCount === 0
	})

	const productSearchItems = computed(() => {
		return results.value?.products?.results || []
	})

	const productHeadlines = computed(() => {
		return results.value?.products?.headlines || {}
	})

	const productCategorySearchItems = computed(() => {
		return results.value?.productCategories?.results || []
	})

	async function search(query: SearchQuery) {
		if (process.prerender) {
			return
		}
		pending.value.results = true

		if (!query.query) {
			return
		}

		const {
			data,
			error: searchError,
			pending: searchPending,
			refresh
		} = await useFetch<SearchResults>(`/api/search`, {
			method: 'get',
			params: {
				query: query.query
			}
		})

		results.value = data.value
		error.value.results = searchError.value
		pending.value.results = searchPending.value

		if (process.client && !resultsEmpty.value) {
			const value = useLocalStorage(`$search:${query.query}`, query.query).value
			if (!storage.value.includes(value)) {
				storage.value.push(value)
			}
		}

		return {
			data,
			error: searchError,
			pending: searchPending,
			refresh
		}
	}

	function reset() {
		results.value = null
		pending.value = pendingFactory()
		error.value = errorsFactory()
	}

	return {
		results,
		storage,
		pending,
		error,
		totalCount,
		resultsEmpty,
		productSearchItems,
		productHeadlines,
		productCategorySearchItems,
		search,
		reset
	}
})
