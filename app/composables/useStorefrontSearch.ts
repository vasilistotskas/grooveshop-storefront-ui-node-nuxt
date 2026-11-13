export type SearchTab = 'products' | 'guides'

/**
 * Everything the search page does that is not its drawing. The URL is the
 * state (`?query=`, `?tab=`, `?page=`), so a search can be shared, reloaded
 * and walked back. Products and guides are two searches, each paged on its
 * own (`/api/products/search`, `/api/search/blog-posts`): one request for
 * both made the guides follow whatever page of products was open. Both run
 * on either tab, for the counts on the tabs.
 *
 * The open tab is the one the URL names (`?tab=products` / `?tab=guides`, a
 * choice or a page link). With none (a search from a field, a shared link)
 * it is the tab with results: the products if there are any, else the
 * guides if there are any. Before, it was the products whenever the URL
 * named no tab, and a word only articles hold opened on «no results»
 * (2026-11-13, webside, «security»: 0 products, 4 articles). What each
 * search asks for follows only the tab the URL names, never the counts, so
 * the page opens on the right tab from its first two requests: with no tab
 * named the guides search asks for a full page, of which the products tab
 * shows the first `asideGuides`; on a named products tab it asks for those
 * alone.
 *
 * The page applies to the open list. A URL with no tab pages the products
 * (the links from before the tabs); when it opens the guides by their
 * results, it shows their first page, which is what the guides search
 * fetched, so the list, its pagination and its next link agree with no
 * second request.
 *
 * An open tab with nothing to show is one of two cases: the tab is empty
 * while the other has results (`emptyTab`: offer the other tab), or the tab
 * has results but not on this page (`emptyPage`, an old or edited link:
 * offer its first page).
 *
 * Shared by every drawing of the page (`Storefront/Search.vue` and the
 * tenants' own). Call it from a body's `<script setup>`, before the
 * first `await`.
 */
export async function useStorefrontSearch(options: { asideGuides: number }) {
  const { locale } = useI18n({ useScope: 'global' })
  const route = useRoute(`search___${locale.value}`)
  const { trackResultClick } = useSearchClickTracking()
  // Without the blog plan there are no guides: no tab and no request
  // (Django answers 404 for the blog search).
  const blogEnabled = useStoreFeature('blog')

  const firstOf = (value: unknown): string =>
    typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : ''

  const query = computed(() => firstOf(route.query.query).trim())
  /** The tab the URL names, if it names one the store has. */
  const namedTab = computed<SearchTab | null>(() => {
    const value = firstOf(route.query.tab)
    if (value === 'products') return 'products'
    return value === 'guides' && blogEnabled.value ? 'guides' : null
  })
  /** The page the URL asks for; `page` is the open list's. */
  const requestedPage = computed(() => Math.max(1, Number(firstOf(route.query.page)) || 1))
  const limit = ref(12)
  const offset = computed(() => (requestedPage.value - 1) * limit.value)

  /**
   * The URL for a state change; `page` drops back to the first unless given.
   * The tab is kept only where the URL named it or the change names it, so a
   * new query opens again on the tab with results.
   */
  function stateQuery(change: { query?: string, tab?: SearchTab, page?: number }) {
    const next = { query: change.query ?? query.value, tab: change.tab ?? namedTab.value, page: change.page ?? 1 }
    return {
      ...(next.query ? { query: next.query } : {}),
      ...(next.tab ? { tab: next.tab } : {}),
      ...(next.page > 1 ? { page: String(next.page) } : {}),
    }
  }

  // The field types freely; the URL — and the searches — follow a beat
  // later, replacing the entry rather than stacking one per keystroke.
  const draft = ref(query.value)
  watch(query, (value) => {
    if (value !== draft.value.trim()) draft.value = value
  })
  const commitDraft = useDebounceFn(() => {
    if (draft.value.trim() === query.value) return
    navigateTo({ query: stateQuery({ query: draft.value.trim() }) }, { replace: true })
  }, 300)

  function search(value: string) {
    draft.value = value
    navigateTo({ query: stateQuery({ query: value }) })
  }

  const hasQuery = computed(() => query.value.length > 0)

  // Each search runs only with something to search for: an empty query
  // would list the whole catalogue.
  const productsOffset = computed(() => namedTab.value === 'guides' ? 0 : offset.value)
  const guidesLimit = computed(() => namedTab.value === 'products' ? options.asideGuides : limit.value)
  const guidesOffset = computed(() => namedTab.value === 'guides' ? offset.value : 0)
  const [
    { data: products, status: productsStatus },
    { data: guides, status: guidesStatus },
  ] = await Promise.all([
    useApi<ProductMeiliSearchResponse>('/api/products/search', {
      query: { query, languageCode: locale, limit, offset: productsOffset, facets: 'category' },
      enabled: hasQuery,
    }),
    useApi<BlogPostMeiliSearchResponse>('/api/search/blog-posts', {
      query: { query, languageCode: locale, limit: guidesLimit, offset: guidesOffset },
      enabled: () => hasQuery.value && blogEnabled.value,
    }),
  ])

  const productCount = computed(() => products.value?.estimatedTotalHits ?? 0)
  const guideCount = computed(() => blogEnabled.value ? guides.value?.estimatedTotalHits ?? 0 : 0)
  /** The open tab: the one the URL names, else the one with results, the products first. */
  const tab = computed<SearchTab>(() => namedTab.value
    ?? (productCount.value === 0 && guideCount.value > 0 ? 'guides' : 'products'))
  /** Nothing in any list the page searched: the one case for «no results». */
  const noResults = computed(() => productCount.value === 0 && guideCount.value === 0)
  /** The guides beside the products, at most `asideGuides` of them. */
  const asideGuides = computed(() => (guides.value?.results ?? []).slice(0, options.asideGuides))
  /** The open list's page: the first of the guides when the results, not the URL, opened them. */
  const page = computed(() => namedTab.value === null && tab.value === 'guides' ? 1 : requestedPage.value)
  const openCount = computed(() => tab.value === 'guides' ? guideCount.value : productCount.value)
  /** What the open tab shows on this page. */
  const openResults = computed<SearchResult[]>(() =>
    (tab.value === 'guides' ? guides.value?.results : products.value?.results) ?? [])
  const pending = computed(() => (tab.value === 'guides' ? guidesStatus : productsStatus).value === 'pending')
  /**
   * The open tab has nothing while the other has results, so the other is
   * the one to offer. Its count is positive by construction, and the guides
   * count only with the blog on.
   */
  const emptyTab = computed(() => !noResults.value && openCount.value === 0)
  const otherTab = computed<SearchTab>(() => tab.value === 'products' ? 'guides' : 'products')
  /** The open tab has results, none of them on this page. */
  const emptyPage = computed(() => openCount.value > 0 && !pending.value && openResults.value.length === 0)
  // The engine widened the query when nothing matched it: say so, the
  // results are not the ones that were asked for.
  const relaxedQuery = computed(() => (tab.value === 'guides' ? guides : products).value?.relaxedQuery ?? null)

  function selectTab(value: string | number) {
    navigateTo({ query: stateQuery({ tab: value === 'guides' ? 'guides' : 'products' }) })
  }

  /** A link to the page in another state, e.g. another query or page. */
  const linkTo = (change: Parameters<typeof stateQuery>[0]) => ({ path: route.path, query: stateQuery(change) })
  // A page of a list names its tab: page 2 is a page of the list that is open.
  const pageLink = (target: number) => linkTo({ page: target, tab: tab.value })

  function changeLimit(value: unknown) {
    const next = Number(value)
    if (!Number.isFinite(next) || next <= 0) return
    limit.value = next
    navigateTo({ query: stateQuery({}) }, { replace: true })
  }

  function onProductClick(product: ProductMeiliSearchResult, index: number) {
    trackResultClick({
      queryId: products.value?.queryId,
      resultId: product.master,
      resultType: 'product',
      position: productsOffset.value + index,
    })
  }

  function onGuideClick(post: BlogPostMeiliSearchResult, index: number) {
    trackResultClick({
      queryId: guides.value?.queryId,
      resultId: post.master,
      resultType: 'blog_post',
      position: guidesOffset.value + index,
    })
  }

  return {
    blogEnabled,
    query,
    tab,
    page,
    limit,
    draft,
    commitDraft,
    search,
    linkTo,
    hasQuery,
    products,
    guides,
    productCount,
    guideCount,
    openCount,
    openResults,
    noResults,
    emptyTab,
    otherTab,
    emptyPage,
    asideGuides,
    pending,
    relaxedQuery,
    selectTab,
    pageLink,
    changeLimit,
    onProductClick,
    onGuideClick,
  }
}
