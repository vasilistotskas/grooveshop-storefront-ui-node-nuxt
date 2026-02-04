/**
 * Composable for sharing product search data across components
 *
 * This composable provides centralized access to:
 * - Price statistics (min/max) for the PriceRange filter
 * - Category facets (product counts) for the CategoryFilter
 * - All categories list (shared between CategoryFilter and ActiveFilters)
 * - Attribute definitions with values for the AttributeFilter
 * - Attribute value facets (product counts) for the AttributeFilter
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
 * const { priceStats, allCategories, getCategoryName, allAttributes, attributeValueFacets } = useProductSearchData()
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
    attributeValues: filters.value.attributeValues.length > 0 ? filters.value.attributeValues.join(',') : undefined,
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
    if (filters.value.attributeValues.length > 0) params.set('attributeValues', filters.value.attributeValues.join(','))
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

  // ============================================
  // ALL ATTRIBUTES (for AttributeFilter)
  // ============================================
  // Fetch all attributes with their values
  // This is needed for AttributeFilter to display available attribute options
  // Uses server-side caching (5 minutes) since attributes don't change frequently
  const { data: allAttributes, status: attributesStatus } = useFetch('/api/products/attributes', {
    key: `all-attributes-${$i18n.locale.value}`,
    query: {
      languageCode: $i18n.locale.value,
    },
  })

  // ============================================
  // ATTRIBUTE VALUE FACETS (product counts per attribute value)
  // ============================================
  // Fetch attribute value facets based on current filters (excluding attribute values)
  // This shows how many products match each attribute value given other filters
  const attributeFacetQuery = computed(() => ({
    languageCode: $i18n.locale.value,
    query: filters.value.search || undefined,
    priceMin: filters.value.priceMin,
    priceMax: filters.value.priceMax,
    likesMin: filters.value.likesMin,
    viewsMin: filters.value.viewsMin,
    categories: filters.value.categories.length > 0 ? filters.value.categories.join(',') : undefined,
    sort: filters.value.sort,
    facets: 'attribute_values',
    limit: 1,
  }))

  // Create a unique key based on filter values (excluding attribute values)
  const attributeFacetKey = computed(() => {
    const params = new URLSearchParams()
    if (filters.value.search) params.set('q', filters.value.search)
    if (filters.value.priceMin !== undefined) params.set('priceMin', filters.value.priceMin.toString())
    if (filters.value.priceMax !== undefined) params.set('priceMax', filters.value.priceMax.toString())
    if (filters.value.likesMin !== undefined) params.set('likesMin', filters.value.likesMin.toString())
    if (filters.value.viewsMin !== undefined) params.set('viewsMin', filters.value.viewsMin.toString())
    if (filters.value.categories.length > 0) params.set('categories', filters.value.categories.join(','))
    if (filters.value.sort) params.set('sort', filters.value.sort)
    return `attribute-facets-${$i18n.locale.value}-${params.toString()}`
  })

  const { data: attributeFacetData } = useFetch('/api/products/search', {
    key: attributeFacetKey,
    query: attributeFacetQuery,
  })

  const attributeValueFacets = computed(() => {
    const distribution = attributeFacetData.value?.facetDistribution as FacetDistribution | undefined
    return distribution?.attributeValues || {}
  })

  // ============================================
  // ALL ATTRIBUTE VALUES (for AttributeFilter and name lookup)
  // ============================================
  // Fetch all attribute values separately since they're not nested in attributes
  const { data: allAttributeValues, status: attributeValuesStatus } = useFetch('/api/products/attributes/values', {
    key: `all-attribute-values-${$i18n.locale.value}`,
    query: {
      languageCode: $i18n.locale.value,
    },
  })

  // Computed attribute value name map - derives from allAttributeValues data
  // This ensures the map is always in sync with the fetched data
  const attributeValueNameMap = computed(() => {
    const map = new Map<string, string>()
    if (allAttributeValues.value?.results) {
      allAttributeValues.value.results.forEach((value) => {
        const valueName = extractTranslated(value, 'value', $i18n.locale.value)
        if (valueName) {
          map.set(value.id.toString(), valueName)
        }
      })
    }
    return map
  })

  /**
   * Get attribute value name by ID
   */
  const getAttributeValueName = (attributeValueId: string): string => {
    return attributeValueNameMap.value.get(attributeValueId) || attributeValueId
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

    // Attribute data
    allAttributes,
    attributesStatus,
    allAttributeValues,
    attributeValuesStatus,
    attributeValueFacets,
    attributeValueNameMap,
    getAttributeValueName,
  }
}
