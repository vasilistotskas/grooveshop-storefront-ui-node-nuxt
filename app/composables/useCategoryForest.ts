/**
 * The listing's category tree and the page's place in it: the filter
 * column's links, the chips under the title and the breadcrumb all read
 * it, through the same search data as the rest of the listing.
 *
 * Inside a listing the scope is the one its page provides. The page
 * itself passes the scope it provides: `inject` reads a component's
 * parents, never the component.
 */
export function useCategoryForest(scope: ListingScope = useListingScope()) {
  const { $i18n } = useNuxtApp()
  const { allCategories, categoryFacets } = useProductSearchData(scope)

  const forest = computed(() => buildCategoryForest(
    allCategories.value ?? [],
    $i18n.locale.value,
    // An empty distribution is "not answered yet" (or a store with no
    // products): draw the tree without counts rather than prune it bare.
    Object.keys(categoryFacets.value).length ? categoryFacets.value : undefined,
    scope.categoryId,
  ))

  /** Root → the page's category; empty on the store-wide listing. */
  const trail = computed(() =>
    scope.categoryId === undefined ? [] : categoryTrail(forest.value, scope.categoryId))

  return { forest, trail }
}
