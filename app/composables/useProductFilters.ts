/**
 * Composable for managing product filter state with URL synchronization
 *
 * This composable provides centralized filter state management for the product listing page.
 * All filter state is persisted in URL query parameters for shareability and bookmarking.
 *
 * @example
 * ```ts
 * const { filters, updateFilters, clearFilters, activeFilterCount } = useProductFilters()
 *
 * // Update a single filter
 * updateFilters({ priceMin: 100 })
 *
 * // Update multiple filters
 * updateFilters({ priceMin: 100, priceMax: 500, categories: ['1', '2'] })
 *
 * // Clear all filters
 * clearFilters()
 * ```
 */

export function useProductFilters() {
  const route = useRoute()
  const router = useRouter()
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  /**
   * Reactive filter state derived from URL query parameters
   */
  const filters = computed<ProductFilters>(() => parseProductFilters(route.query))

  /**
   * Update one or more filters and sync to URL
   *
   * @param updates - Partial filter updates to apply
   */
  const updateFilters = async (updates: Partial<ProductFilters>) => {
    await router.push({ query: applyFilterUpdates(route.query, updates) })
  }

  /**
   * Clear all filters and return to default state
   */
  const clearFilters = async () => {
    await router.push({ query: {} })
  }

  /**
   * Remove a specific filter
   *
   * @param key - The filter key to remove
   */
  const removeFilter = async (key: keyof ProductFilters) => {
    switch (key) {
      case 'search':
        await updateFilters({ search: '' })
        break
      case 'priceMin':
        await updateFilters({ priceMin: undefined })
        break
      case 'priceMax':
        await updateFilters({ priceMax: undefined })
        break
      case 'likesMin':
        await updateFilters({ likesMin: undefined })
        break
      case 'viewsMin':
        await updateFilters({ viewsMin: undefined })
        break
      case 'categories':
        await updateFilters({ categories: [] })
        break
      case 'sort':
        await updateFilters({ sort: '' })
        break
      case 'attributeValues':
        await updateFilters({ attributeValues: [] })
        break
    }
  }

  /**
   * Count of active filters (excluding default sort)
   */
  const activeFilterCount = computed(() => countActiveFilters(filters.value))

  /**
   * Generate filter chips for active filters
   */
  const activeFilterChips = computed<FilterChip[]>(() => buildFilterChips(filters.value, t))

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  /**
   * Count of active filters per section
   * Used to display badges on filter section headers
   */
  const filterCountBySection = computed(() => countFiltersBySection(filters.value))

  return {
    filters,
    updateFilters,
    clearFilters,
    removeFilter,
    activeFilterCount,
    activeFilterChips,
    hasActiveFilters,
    filterCountBySection,
  }
}
