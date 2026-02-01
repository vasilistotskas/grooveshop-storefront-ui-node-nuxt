/**
 * Composable for instant search with optimized debounce and request cancellation
 *
 * This composable provides reactive instant search functionality with:
 * - Optimized 150ms debounce (reduced from 500ms)
 * - AbortController for request cancellation
 * - URL query parameter synchronization
 * - Type-safe validation with auto-imported Zod schemas
 * - Loading state tracking
 *
 * @example
 * ```ts
 * const { searchQuery, results, isSearching, search } = useInstantSearch({
 *   endpoint: 'federated',
 *   languageCode: 'en',
 *   limit: 20
 * })
 *
 * // Watch for query changes
 * watch(searchQuery, (newQuery) => {
 *   search(newQuery)
 * })
 * ```
 */

export interface InstantSearchOptions {
  /** Debounce delay in milliseconds (default: 150ms) */
  debounceMs?: number
  /** Search endpoint type */
  endpoint: 'products' | 'blog-posts' | 'federated'
  /** Language code for filtering results */
  languageCode?: string
  /** Maximum number of results to return */
  limit?: number
}

export interface InstantSearchResult<T> {
  /** Reactive search query string */
  searchQuery: Ref<string>
  /** Reactive search results array */
  results: Ref<T[]>
  /** Loading state indicator */
  isSearching: Ref<boolean>
  /** Total number of matching results */
  estimatedTotalHits: Ref<number>
  /** Facet distribution for filtering */
  facetDistribution: Ref<Record<string, Record<string, number>>>
  /** Facet statistics (min/max values) */
  facetStats: Ref<Record<string, { min: number, max: number }>>
  /** Execute search with the given query */
  search: (query: string) => Promise<void>
  /** Clear search results and query */
  clear: () => void
}

/**
 * Create an instant search composable with debounce and abort control
 *
 * @param options - Configuration options for the search
 * @returns Reactive search state and control functions
 */
export function useInstantSearch<T = any>(
  options: InstantSearchOptions,
): InstantSearchResult<T> {
  const route = useRoute()
  const router = useRouter()

  // Default options
  const debounceMs = options.debounceMs ?? 150
  const limit = options.limit ?? 20

  // Reactive state
  const searchQuery = ref<string>((route.query.q as string) || '')
  const results = ref<T[]>([]) as Ref<T[]>
  const isSearching = ref(false)
  const estimatedTotalHits = ref(0)
  const facetDistribution = ref<Record<string, Record<string, number>>>({})
  const facetStats = ref<Record<string, { min: number, max: number }>>({})

  // AbortController for request cancellation
  let abortController: AbortController | null = null

  /**
   * Execute search request with abort control
   */
  const executeSearch = async (query: string) => {
    // Cancel any pending request
    if (abortController) {
      abortController.abort()
    }

    // Create new abort controller for this request
    abortController = new AbortController()

    // Skip search if query is empty
    if (!query.trim()) {
      results.value = []
      estimatedTotalHits.value = 0
      facetDistribution.value = {}
      facetStats.value = {}
      isSearching.value = false
      return
    }

    try {
      isSearching.value = true

      // Build API endpoint based on search type
      let endpoint: string
      switch (options.endpoint) {
        case 'products':
          endpoint = '/api/products/search'
          break
        case 'blog-posts':
          endpoint = '/api/blog/search'
          break
        case 'federated':
          endpoint = '/api/search/federated'
          break
        default:
          throw new Error(`Unknown endpoint: ${options.endpoint}`)
      }

      // Build query parameters
      const queryParams: Record<string, any> = {
        query,
        limit,
        offset: 0,
      }

      if (options.languageCode) {
        queryParams.languageCode = options.languageCode
      }

      // Execute search request
      // Note: Response validation happens on the server-side API routes
      // using parseDataAs with auto-imported Zod schemas
      const response = await $fetch(endpoint, {
        method: 'GET',
        query: queryParams,
        signal: abortController.signal,
      })

      // Type assertion based on endpoint type
      // The server-side routes already validate responses with Zod schemas
      let typedResponse: any

      if (options.endpoint === 'products') {
        typedResponse = response as ProductMeiliSearchResponse
      }
      else if (options.endpoint === 'blog-posts') {
        typedResponse = response as BlogPostMeiliSearchResponse
      }
      else if (options.endpoint === 'federated') {
        // For federated search, use the response as-is
        // The backend endpoint will validate the response structure
        typedResponse = response
      }

      // Update reactive state with results
      results.value = typedResponse.results || []
      estimatedTotalHits.value = typedResponse.estimatedTotalHits || 0

      // Update facet data if available
      if (typedResponse.facetDistribution) {
        facetDistribution.value = typedResponse.facetDistribution
      }
      if (typedResponse.facetStats) {
        facetStats.value = typedResponse.facetStats
      }
    }
    catch (error: any) {
      // Ignore abort errors (expected when cancelling requests)
      if (error.name === 'AbortError') {
        return
      }

      // Log other errors
      console.error('Search error:', error)

      // Clear results on error
      results.value = []
      estimatedTotalHits.value = 0
      facetDistribution.value = {}
      facetStats.value = {}
    }
    finally {
      isSearching.value = false
    }
  }

  // Create debounced search function using VueUse
  const debouncedSearch = useDebounceFn(executeSearch, debounceMs)

  /**
   * Public search function that updates URL and triggers debounced search
   */
  const search = async (query: string) => {
    // Update search query ref
    searchQuery.value = query

    // Sync with URL query parameters
    const newQuery = { ...route.query }
    if (query.trim()) {
      newQuery.q = query
    }
    else {
      delete newQuery.q
    }

    // Update URL without triggering navigation
    await router.replace({ query: newQuery })

    // Execute debounced search
    debouncedSearch(query)
  }

  /**
   * Clear search results and query
   */
  const clear = () => {
    searchQuery.value = ''
    results.value = []
    estimatedTotalHits.value = 0
    facetDistribution.value = {}
    facetStats.value = {}
    isSearching.value = false

    // Clear URL query parameter
    const newQuery = { ...route.query }
    delete newQuery.q
    router.replace({ query: newQuery })

    // Cancel any pending request
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  // Initialize search from URL on mount
  onMounted(() => {
    const initialQuery = route.query.q as string
    if (initialQuery) {
      searchQuery.value = initialQuery
      executeSearch(initialQuery)
    }
  })

  // Watch for URL changes (e.g., browser back/forward)
  watch(
    () => route.query.q,
    (newQuery) => {
      const queryString = (newQuery as string) || ''
      if (queryString !== searchQuery.value) {
        searchQuery.value = queryString
        if (queryString) {
          executeSearch(queryString)
        }
        else {
          clear()
        }
      }
    },
  )

  return {
    searchQuery,
    results,
    isSearching,
    estimatedTotalHits,
    facetDistribution,
    facetStats,
    search,
    clear,
  }
}
