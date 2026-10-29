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
 * The price bounds and both kinds of count are not requested here: they come
 * from the listing's own search (`useProductListingSearch`, `sidebarFacets`),
 * so a listing makes one products search however many controls read them.
 * The attribute and category lists are separate requests with one key each.
 *
 * @see https://nuxt.com/docs/getting-started/data-fetching
 * @see https://nuxt.com/docs/getting-started/state-management
 *
 * @example
 * ```ts
 * const { priceStats, allCategories, getCategoryName, allAttributes, attributeValueFacets } = useProductSearchData()
 * ```
 */

export interface ProductSearchScope {
  /**
   * The category a listing page is about. Its price bounds and attribute
   * counts are then the category's own: a charger page offering a
   * "Colour" of a case it does not sell, or a slider reaching the price
   * of the dearest product in the store, describes another page.
   */
  categoryId?: MaybeRefOrGetter<number | undefined>
}

export function useProductSearchData(scope: ProductSearchScope = {}) {
  const { $i18n } = useNuxtApp()
  const scopeCategory = computed(() => toValue(scope.categoryId))
  // The listing's one search; see useProductListingSearch.
  const { request: listing } = useProductListingSearch(scopeCategory)
  const requestFetch = useRequestApi()
  // Four filter components read these keys in one render. 'defer' joins
  // a reader to the fetch in flight (the default 'cancel' aborts and
  // re-issues it per reader), and the server-render rule answers a
  // reader that arrives after it settled; together, one request per key
  // (measured 2026-09-25: 12-13 duplicate requests per /products render).
  const shared = { dedupe: 'defer', ...serverRenderCachedData() } as const

  // ============================================
  // PRICE STATISTICS (for PriceRange slider bounds)
  // ============================================
  // The real bounds, or undefined: before they arrive (Nuxt 4 starts
  // `data` as undefined, so a `!== null` check was always true), when
  // the fetch failed, or when the search reports no priced product. The
  // bounds are the store's, or the scoped category's: filters never move
  // the slider's ends.
  const priceBounds = computed(() =>
    (listing.data.value?.facetStats as FacetStats | undefined)?.effectivePrice)

  // Gates the slider: without real bounds it shows its skeleton.
  const isPriceStatsLoaded = computed(() => priceBounds.value !== undefined)

  // Only ever rendered once loaded; the placeholder keeps the slider's
  // props defined while the skeleton is up.
  const priceStats = computed(() => priceBounds.value ?? { min: 0, max: 1000 })

  // ============================================
  // CATEGORY FACETS (product counts per category)
  // ============================================
  // How many products match each category given the other filters.
  const categoryFacets = computed(() => {
    const distribution = listing.data.value?.facetDistribution as FacetDistribution | undefined
    return distribution?.category || {}
  })

  // ============================================
  // ALL CATEGORIES (shared between CategoryFilter and ActiveFilters)
  // ============================================
  // The same entry the header's category menu reads (useAllCategories).
  // Needed for both CategoryFilter (list display) and ActiveFilters (name lookup)
  const { data: allCategories, status: categoriesStatus } = useAllCategories()

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
  const { data: allAttributes, status: attributesStatus } = useAsyncData(
    () => `all-attributes-${$i18n.locale.value}`,
    () => requestFetch('/api/products/attributes', { query: { languageCode: $i18n.locale.value } }),
    { ...shared, watch: [$i18n.locale] },
  )

  // ============================================
  // ATTRIBUTE VALUE FACETS (product counts per attribute value)
  // ============================================
  // How many products each attribute value would show. Unlike the
  // other facets this one carries its own selection: values of one
  // attribute combine with OR and different attributes with AND, so a
  // selected colour must narrow the sizes' counts but not the other
  // colours'. Django applies exactly that per attribute (disjunctive
  // facets).
  const attributeValueFacets = computed(() => {
    const distribution = listing.data.value?.facetDistribution as FacetDistribution | undefined
    return distribution?.attributeValues || {}
  })

  // ============================================
  // ALL ATTRIBUTE VALUES (for AttributeFilter and name lookup)
  // ============================================
  // Fetch all attribute values separately since they're not nested in attributes
  const { data: allAttributeValues, status: attributeValuesStatus } = useAsyncData(
    () => `all-attribute-values-${$i18n.locale.value}`,
    () => requestFetch('/api/products/attributes/values', { query: { languageCode: $i18n.locale.value } }),
    { ...shared, watch: [$i18n.locale] },
  )

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
