/**
 * Min/max statistics of one numeric search facet (`likes_count`,
 * `view_count`), for the slider that filters by it. They are the whole
 * store's, whatever the filters: read from the listing's own search
 * (`useProductListingSearch`, `sidebarFacets`), not a request of their own.
 * Call it from a component inside a listing, which provides the scope.
 */
const STAT_FIELDS = {
  likes_count: 'likesCount',
  view_count: 'viewCount',
} as const

export function useProductFacetStats(facet: keyof typeof STAT_FIELDS) {
  const { request: listing } = useProductListingSearch(useListingScope().categoryId)

  /** The field's `{ min, max }`, or `undefined` until the listing answers. */
  const stats = computed(() => {
    const facetStats = listing.data.value?.facetStats as FacetStats | undefined
    return facetStats?.[STAT_FIELDS[facet]]
  })

  return { stats }
}
