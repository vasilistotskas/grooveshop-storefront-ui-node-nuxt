/**
 * The brand filter's data: the search's `brand` facet (product counts per
 * brand id) and the brand list that names those ids.
 *
 * Its own composable, not part of `useProductSearchData`, because the
 * frozen webside listing reads that one and has no brand filter: it must
 * not make these two requests. Only the redesigned listing calls this.
 */
export function useProductBrands(scope: ProductSearchScope = {}) {
  const { $i18n } = useNuxtApp()
  const { filters } = useProductFilters()
  const requestFetch = useRequestApi()
  // One request per key however many readers it has (see useProductSearchData).
  const shared = { dedupe: 'defer', ...serverRenderCachedData() } as const

  // The listing's category scope and every filter but the brands
  // themselves: how many products each brand would add or keep.
  const categories = computed(() => scopedCategories(filters.value.categories, toValue(scope.categoryId)))
  const facetQuery = computed(() => ({
    languageCode: $i18n.locale.value,
    query: filters.value.search || undefined,
    priceMin: filters.value.priceMin,
    priceMax: filters.value.priceMax,
    likesMin: filters.value.likesMin,
    viewsMin: filters.value.viewsMin,
    categories: categories.value.length > 0 ? categories.value.join(',') : undefined,
    attributeValues: filters.value.attributeValues.length > 0 ? filters.value.attributeValues.join(',') : undefined,
    ...availabilityFacetQuery(filters.value),
    sort: filters.value.sort,
    facets: 'brand',
    limit: 1,
  }))

  const facetKey = computed(() => {
    const params = new URLSearchParams()
    if (filters.value.search) params.set('q', filters.value.search)
    if (filters.value.priceMin !== undefined) params.set('priceMin', filters.value.priceMin.toString())
    if (filters.value.priceMax !== undefined) params.set('priceMax', filters.value.priceMax.toString())
    if (filters.value.likesMin !== undefined) params.set('likesMin', filters.value.likesMin.toString())
    if (filters.value.viewsMin !== undefined) params.set('viewsMin', filters.value.viewsMin.toString())
    if (categories.value.length > 0) params.set('categories', categories.value.join(','))
    if (filters.value.attributeValues.length > 0) params.set('attributeValues', filters.value.attributeValues.join(','))
    const availability = availabilityFacetKey(filters.value)
    if (availability) params.set('availability', availability)
    if (filters.value.sort) params.set('sort', filters.value.sort)
    return `brand-facets-${$i18n.locale.value}-${params.toString()}`
  })

  const { data: facetData } = useAsyncData(
    () => `search:facets:${facetKey.value}`,
    () => requestFetch('/api/products/search', { query: facetQuery.value }),
    { ...shared, watch: [facetKey, facetQuery] },
  )

  const brandFacets = computed(() => {
    const distribution = facetData.value?.facetDistribution as FacetDistribution | undefined
    return distribution?.brand || {}
  })

  // The facet counts brand ids; the list names them.
  const { data: allBrands } = useAllBrands()

  const brandNameMap = computed(() => new Map(
    (allBrands.value ?? []).map(brand => [String(brand.id), brand.name]),
  ))

  /**
   * Get brand name by ID
   */
  const getBrandName = (brandId: string): string => {
    return brandNameMap.value.get(brandId) || brandId
  }

  return {
    allBrands,
    brandFacets,
    getBrandName,
  }
}
