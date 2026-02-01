/**
 * Composable for sharing product search data across components
 *
 * This composable provides centralized access to:
 * - Price statistics (min/max) for the PriceRange filter
 * - Category facets (product counts) for the CategoryFilter
 * - All categories list (shared between CategoryFilter and ActiveFilters)
 *
 * Following Nuxt best practices:
 * - Uses `useFetch` with consistent keys for automatic deduplication
 * - Uses `useState` for shared reactive state (category name map)
 * - Computed keys ensure proper cache invalidation when filters change
 *
 * @see https://nuxt.com/docs/getting-started/data-fetching
 * @see https://nuxt.com/docs/getting-started/state-management
 *
 * @example
 * ```ts
 * const { priceStats, allCategories, getCategoryName } = useProductSearchData()
 * ```
 */

export function useProductSearchData() {
  const { $i18n } = useNuxtApp()
  const { filters } = useProductFilters()

  // ============================================
  // PRICE STATISTICS (for PriceRange slider bounds)
  // ============================================
  // Fetch global price min/max once (without any filters applied)
  // This gives us the absolute bounds for the price slider
  // Key is locale-based so it's shared across all components
  // Using useAsyncData with getCachedData to ensure proper SSR hydration
  const { data: priceStatsData, status: priceStatsStatus } = useAsyncData(
    `price-stats-${$i18n.locale.value}`,
    () => $fetch('/api/products/search', {
      query: {
        facets: 'final_price',
        limit: 1,
        languageCode: $i18n.locale.value,
      },
    }),
    {
      // Use cached data if available (prevents refetch on client)
      getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key],
    },
  )

  // Check if price stats are loaded - data is available when useAsyncData completes
  const isPriceStatsLoaded = computed(() => priceStatsData.value !== null)

  // Extract price stats from the response
  // This computed is reactive and will update when data changes
  const priceStats = computed(() => {
    const stats = priceStatsData.value?.facetStats as FacetStats | undefined
    return stats?.finalPrice || { min: 0, max: 1000 }
  })

  // ============================================
  // CATEGORY FACETS (product counts per category)
  // ============================================
  // Fetch category facets based on current filters (excluding categories)
  // This shows how many products match each category given other filters
  // MUST be defined before allCategories since it's used to determine which categories to fetch
  const facetQuery = computed(() => ({
    languageCode: $i18n.locale.value,
    query: filters.value.search || undefined,
    priceMin: filters.value.priceMin,
    priceMax: filters.value.priceMax,
    likesMin: filters.value.likesMin,
    viewsMin: filters.value.viewsMin,
    sort: filters.value.sort,
    facets: 'category',
    limit: 1,
  }))

  // Create a unique key based on filter values (excluding categories)
  const facetKey = computed(() => {
    const params = new URLSearchParams()
    if (filters.value.search) params.set('q', filters.value.search)
    if (filters.value.priceMin !== undefined) params.set('priceMin', filters.value.priceMin.toString())
    if (filters.value.priceMax !== undefined) params.set('priceMax', filters.value.priceMax.toString())
    if (filters.value.likesMin !== undefined) params.set('likesMin', filters.value.likesMin.toString())
    if (filters.value.viewsMin !== undefined) params.set('viewsMin', filters.value.viewsMin.toString())
    if (filters.value.sort) params.set('sort', filters.value.sort)
    return `category-facets-${$i18n.locale.value}-${params.toString()}`
  })

  const { data: facetData } = useFetch('/api/products/search', {
    key: facetKey,
    query: facetQuery,
  })

  const categoryFacets = computed(() => {
    const distribution = facetData.value?.facetDistribution as FacetDistribution | undefined
    return distribution?.category || {}
  })

  // ============================================
  // ALL CATEGORIES (shared between CategoryFilter and ActiveFilters)
  // ============================================
  // Fetch all categories using the dedicated unpaginated endpoint
  // This is needed for both CategoryFilter (list display) and ActiveFilters (name lookup)
  // The /all endpoint returns a flat array without pagination wrapper
  const { data: allCategories, status: categoriesStatus } = useFetch('/api/products/categories/all', {
    key: `all-categories-${$i18n.locale.value}`,
  })

  // Computed category name map - derives from allCategories data
  // This ensures the map is always in sync with the fetched data
  const categoryNameMap = computed(() => {
    const map = new Map<string, string>()
    if (allCategories.value) {
      allCategories.value.forEach((category) => {
        const name = extractTranslated(category, 'name', $i18n.locale.value)
        if (name) {
          map.set(category.id.toString(), name)
        }
      })
    }
    return map
  })

  /**
   * Get category name by ID
   */
  const getCategoryName = (categoryId: string): string => {
    return categoryNameMap.value.get(categoryId) || categoryId
  }

  return {
    // Price data
    priceStats,
    priceStatsStatus,
    isPriceStatsLoaded,

    // Category data
    allCategories,
    categoriesStatus,
    categoryNameMap,
    getCategoryName,
    categoryFacets,
  }
}
