import type { IFetchError } from 'ofetch'

import type { SearchResults } from '~/types/search'

interface ErrorRecord {
  results: IFetchError | null
}

interface PendingRecord {
  results: boolean
}

const errorsFactory = (): ErrorRecord => ({
  results: null,
})

const pendingFactory = (): PendingRecord => ({
  results: false,
})

export const useSearchStore = defineStore('search', () => {
  const results = ref<SearchResults | null>(null)
  const searchHistory = useStorageAsync<string[]>('searchHistory', [])
  const pending = ref<PendingRecord>(pendingFactory())
  const error = ref<ErrorRecord>(errorsFactory())

  const totalCount = computed(() => {
    const totalProductsCount = results.value?.products?.resultCount || 0
    const totalBlogPostsCount = results.value?.blogPosts?.resultCount || 0
    return totalProductsCount + totalBlogPostsCount
  })

  const totalProductsCount = computed(() => {
    return results.value?.products?.resultCount || 0
  })

  const totalBlogPostsCount = computed(() => {
    return results.value?.blogPosts?.resultCount || 0
  })

  const resultsEmpty = computed(() => {
    if (!results.value) {
      return true
    }
    const totalProductsCount = results.value?.products?.resultCount || 0
    const totalBlogPostsCount
      = results.value?.blogPosts?.resultCount || 0
    return totalProductsCount + totalBlogPostsCount === 0
  })

  const productSearchItems = computed(() => {
    return results.value?.products?.results || []
  })

  const blogPostSearchItems = computed(() => {
    return results.value?.blogPosts?.results || []
  })

  const productHeadlines = computed(() => {
    return results.value?.products?.headlines || {}
  })

  const blogPostHeadlines = computed(() => {
    return results.value?.blogPosts?.headlines || {}
  })

  const addToSearchHistory = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase()
    const history = searchHistory.value.map(item => item.toLowerCase())
    if (!history.includes(normalizedQuery)) {
      searchHistory.value = [query.trim(), ...searchHistory.value].slice(0, 9)
    }
  }

  const clearSearchHistory = () => {
    searchHistory.value = []
  }

  const clearSearchHistoryItem = (query: string) => {
    searchHistory.value = searchHistory.value.filter(item => item !== query)
  }

  const reset = () => {
    results.value = null
    pending.value = pendingFactory()
    error.value = errorsFactory()
  }

  return {
    results,
    searchHistory,
    pending,
    error,
    totalCount,
    totalProductsCount,
    totalBlogPostsCount,
    resultsEmpty,
    productSearchItems,
    blogPostSearchItems,
    productHeadlines,
    blogPostHeadlines,
    addToSearchHistory,
    clearSearchHistory,
    clearSearchHistoryItem,
    reset,
  }
})
