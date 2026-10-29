/**
 * The one search a product listing makes per render: its page of products
 * AND every count and range the filter column draws (`sidebarFacets`:
 * category, brand and attribute-value counts, the price, likes and views
 * ranges).
 *
 * The listing, the filter controls, the chips and the page's structured
 * data all read it. They call this composable with the same scope, so
 * they share one key and, with identical options, one request: a reader
 * that arrives while it is in flight joins it, one that arrives after
 * takes the render's answer (`serverRenderCachedData`).
 *
 * The page and the items per page are state of the listing, not of one
 * reader, so they live here: the sidebar's request must carry the same
 * `limit` and `offset` as the listing's, or the two would be two keys'
 * worth of options.
 */

/** Matches the toolbar's default. */
const DEFAULT_LIMIT = 12

/**
 * Facets the filter column draws. `category`, `brand` and the three stat
 * facets are answered the sidebar's way by `sidebarFacets`.
 */
const SIDEBAR_FACETS = 'category,brand,attribute_values,effective_price,likes_count,view_count'

export function useProductListingSearch(categoryId: MaybeRefOrGetter<number | undefined>) {
  const route = useRoute()
  const { $i18n } = useNuxtApp()
  const locale = computed(() => $i18n.locale.value)
  const { filters } = useProductFilters()

  const limit = useState<number>('product-listing-limit', () => DEFAULT_LIMIT)
  // The URL is the single source of truth for the page.
  const page = computed(() => {
    const pageNum = Number(route.query.page)
    return pageNum > 0 ? pageNum : 1
  })
  const offset = computed(() => (page.value - 1) * limit.value)

  // The page's own category (when on a category page) unioned with the
  // URL's category filter, as the comma-joined string the API expects.
  const categories = computed(() => {
    const scoped = scopedCategories(filters.value.categories, toValue(categoryId))
    return scoped.length > 0 ? scoped.join(',') : undefined
  })

  const request = useApi<ProductMeiliSearchResponse>(
    '/api/products/search',
    {
      key: computed(() => `product-listing-${locale.value}-${toValue(categoryId) ?? 'all'}`),
      query: {
        query: computed(() => filters.value.search || undefined),
        priceMin: computed(() => filters.value.priceMin),
        priceMax: computed(() => filters.value.priceMax),
        likesMin: computed(() => filters.value.likesMin),
        viewsMin: computed(() => filters.value.viewsMin),
        categories,
        attributeValues: computed(() => filters.value.attributeValues.length > 0 ? filters.value.attributeValues.join(',') : undefined),
        brands: computed(() => filters.value.brands.length > 0 ? filters.value.brands.join(',') : undefined),
        inStock: computed(() => filters.value.inStock || undefined),
        onOffer: computed(() => filters.value.onOffer || undefined),
        sort: computed(() => filters.value.sort),
        languageCode: locale,
        limit,
        offset,
        facets: SIDEBAR_FACETS,
        sidebarFacets: true,
        // The category page's own category: it scopes the price range
        // and is not a filter (`categories` carries that).
        scopeCategory: computed(() => toValue(categoryId)),
      },
      // Every reader of the key asks with these options: a later one joins
      // the request in flight instead of cancelling it.
      dedupe: 'defer',
      watch: [limit, offset],
    },
  )

  return { request, limit, page, offset }
}
