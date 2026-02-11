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

export interface ProductFilters {
  /** Full-text search query */
  search: string
  /** Minimum price filter */
  priceMin: number | undefined
  /** Maximum price filter */
  priceMax: number | undefined
  /** Minimum likes threshold */
  likesMin: number | undefined
  /** Minimum views threshold */
  viewsMin: number | undefined
  /** Selected category IDs */
  categories: string[]
  /** Sort field and direction */
  sort: string
  /** Selected attribute value IDs */
  attributeValues: string[]
}

export interface FilterChip {
  /** Filter key for removal */
  key: keyof ProductFilters
  /** Filter type for formatting */
  type: 'search' | 'price' | 'likes' | 'views' | 'category' | 'sort' | 'attribute'
  /** Display label */
  label: string
  /** Filter value */
  value: any
}

export function useProductFilters() {
  const route = useRoute()
  const router = useRouter()
  const { $i18n } = useNuxtApp()

  /**
   * Reactive filter state derived from URL query parameters
   */
  const filters = computed<ProductFilters>(() => ({
    search: (route.query.q as string) || '',
    priceMin: route.query.priceMin ? Number(route.query.priceMin) : undefined,
    priceMax: route.query.priceMax ? Number(route.query.priceMax) : undefined,
    likesMin: route.query.likesMin ? Number(route.query.likesMin) : undefined,
    viewsMin: route.query.viewsMin ? Number(route.query.viewsMin) : undefined,
    categories: route.query.category
      ? Array.isArray(route.query.category)
        ? (route.query.category as string[])
        : [route.query.category as string]
      : [],
    sort: (route.query.sort as string) || '',
    attributeValues: route.query.attributeValue
      ? Array.isArray(route.query.attributeValue)
        ? (route.query.attributeValue as string[])
        : [route.query.attributeValue as string]
      : [],
  }))

  /**
   * Update one or more filters and sync to URL
   *
   * @param updates - Partial filter updates to apply
   */
  const updateFilters = async (updates: Partial<ProductFilters>) => {
    const newQuery: Record<string, any> = { ...route.query }

    // Apply updates
    if (updates.search !== undefined) {
      if (updates.search) {
        newQuery.q = updates.search
      }
      else {
        delete newQuery.q
      }
    }

    if ('priceMin' in updates) {
      if (updates.priceMin !== undefined && updates.priceMin !== null) {
        newQuery.priceMin = updates.priceMin.toString()
      }
      else {
        delete newQuery.priceMin
      }
    }

    if ('priceMax' in updates) {
      if (updates.priceMax !== undefined && updates.priceMax !== null) {
        newQuery.priceMax = updates.priceMax.toString()
      }
      else {
        delete newQuery.priceMax
      }
    }

    if ('likesMin' in updates) {
      if (updates.likesMin !== undefined && updates.likesMin !== null) {
        newQuery.likesMin = updates.likesMin.toString()
      }
      else {
        delete newQuery.likesMin
      }
    }

    if ('viewsMin' in updates) {
      if (updates.viewsMin !== undefined && updates.viewsMin !== null) {
        newQuery.viewsMin = updates.viewsMin.toString()
      }
      else {
        delete newQuery.viewsMin
      }
    }

    if (updates.categories !== undefined) {
      if (updates.categories.length > 0) {
        newQuery.category = updates.categories.length === 1 ? updates.categories[0] : updates.categories
      }
      else {
        delete newQuery.category
      }
    }

    if (updates.sort !== undefined) {
      if (updates.sort) {
        newQuery.sort = updates.sort
      }
      else {
        delete newQuery.sort
      }
    }

    if (updates.attributeValues !== undefined) {
      if (updates.attributeValues.length > 0) {
        newQuery.attributeValue = updates.attributeValues.length === 1
          ? updates.attributeValues[0]
          : updates.attributeValues
      }
      else {
        delete newQuery.attributeValue
      }
    }

    // Navigate to updated URL
    await router.push({ query: newQuery })
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
  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.search) count++
    if (filters.value.priceMin !== undefined) count++
    if (filters.value.priceMax !== undefined) count++
    if (filters.value.likesMin !== undefined) count++
    if (filters.value.viewsMin !== undefined) count++
    if (filters.value.categories.length > 0) count++
    if (filters.value.sort) count++
    if (filters.value.attributeValues.length > 0) count++
    return count
  })

  /**
   * Generate filter chips for active filters
   */
  const activeFilterChips = computed<FilterChip[]>(() => {
    const chips: FilterChip[] = []

    if (filters.value.search) {
      chips.push({
        key: 'search',
        type: 'search',
        label: $i18n.t('filters.search'),
        value: filters.value.search,
      })
    }

    if (filters.value.priceMin !== undefined || filters.value.priceMax !== undefined) {
      chips.push({
        key: 'priceMin', // Use priceMin as key, but represents the range
        type: 'price',
        label: $i18n.t('filters.price'),
        value: {
          min: filters.value.priceMin,
          max: filters.value.priceMax,
        },
      })
    }

    if (filters.value.likesMin !== undefined) {
      chips.push({
        key: 'likesMin',
        type: 'likes',
        label: $i18n.t('filters.popularity'),
        value: filters.value.likesMin,
      })
    }

    if (filters.value.viewsMin !== undefined) {
      chips.push({
        key: 'viewsMin',
        type: 'views',
        label: $i18n.t('filters.view_count'),
        value: filters.value.viewsMin,
      })
    }

    // Category chips - one per category
    filters.value.categories.forEach((categoryId) => {
      chips.push({
        key: 'categories',
        type: 'category',
        label: $i18n.t('filters.categories'),
        value: categoryId,
      })
    })

    // Attribute value chips - one per attribute value
    filters.value.attributeValues.forEach((attributeValueId) => {
      chips.push({
        key: 'attributeValues',
        type: 'attribute',
        label: $i18n.t('filters.attributes'),
        value: attributeValueId,
      })
    })

    if (filters.value.sort) {
      chips.push({
        key: 'sort',
        type: 'sort',
        label: $i18n.t('filters.sort'),
        value: filters.value.sort,
      })
    }

    return chips
  })

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  /**
   * Count of active filters per section
   * Used to display badges on filter section headers
   */
  const filterCountBySection = computed(() => ({
    search: filters.value.search ? 1 : 0,
    price: (filters.value.priceMin !== undefined || filters.value.priceMax !== undefined) ? 1 : 0,
    popularity: filters.value.likesMin !== undefined ? 1 : 0,
    viewCount: filters.value.viewsMin !== undefined ? 1 : 0,
    categories: filters.value.categories.length,
    attributes: filters.value.attributeValues.length,
  }))

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
