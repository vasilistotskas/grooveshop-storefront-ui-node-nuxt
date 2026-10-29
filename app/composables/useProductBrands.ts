/**
 * The brand filter's data: the search's `brand` facet (product counts per
 * brand id) and the brand list that names those ids.
 *
 * Its own composable, not part of `useProductSearchData`: only the
 * brand filter and the chips that name a brand need the brand list. The
 * counts come from the listing's own search (`useProductListingSearch`),
 * where `sidebarFacets` leaves the brands' own selection out of them.
 */
export function useProductBrands(scope: ProductSearchScope = {}) {
  const { request: listing } = useProductListingSearch(scope.categoryId)

  const brandFacets = computed(() => {
    const distribution = listing.data.value?.facetDistribution as FacetDistribution | undefined
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
