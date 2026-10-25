export type SearchTab = 'products' | 'guides'

/**
 * Everything the search page does that is not its drawing. The URL is the
 * state (`?query=`, `?tab=guides`, `?page=`), so a search can be shared,
 * reloaded and walked back. Products and guides are two searches, each
 * paged on its own (`/api/products/search`, `/api/search/blog-posts`):
 * one request for both made the guides follow whatever page of products
 * was open. Both run on either tab, for the counts on the tabs; the open
 * tab's search is the one that pages, and on the products tab the guides
 * search asks only for the `asideGuides` shown beside them.
 *
 * Shared by every drawing of the page (`Storefront/Search.vue` and the
 * tenants' own). Call it from a body's `<script setup>`, before the
 * first `await`.
 */
export async function useStorefrontSearch(options: { asideGuides: number }) {
  const { locale } = useI18n()
  const route = useRoute(`search___${locale.value}`)
  const { trackResultClick } = useSearchClickTracking()
  // Without the blog plan there are no guides: no tab and no request
  // (Django answers 404 for the blog search).
  const blogEnabled = useStoreFeature('blog')

  const firstOf = (value: unknown): string =>
    typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : ''

  const query = computed(() => firstOf(route.query.query).trim())
  const tab = computed<SearchTab>(() => route.query.tab === 'guides' && blogEnabled.value ? 'guides' : 'products')
  const page = computed(() => Math.max(1, Number(firstOf(route.query.page)) || 1))
  const limit = ref(12)
  const offset = computed(() => (page.value - 1) * limit.value)

  /** The URL for a state change; `page` drops back to the first unless given. */
  function stateQuery(change: { query?: string, tab?: SearchTab, page?: number }) {
    const next = { query: change.query ?? query.value, tab: change.tab ?? tab.value, page: change.page ?? 1 }
    return {
      ...(next.query ? { query: next.query } : {}),
      ...(next.tab === 'guides' ? { tab: 'guides' } : {}),
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
  const productsOffset = computed(() => tab.value === 'products' ? offset.value : 0)
  const guidesLimit = computed(() => tab.value === 'guides' ? limit.value : options.asideGuides)
  const guidesOffset = computed(() => tab.value === 'guides' ? offset.value : 0)
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
  const guideCount = computed(() => guides.value?.estimatedTotalHits ?? 0)
  const openCount = computed(() => tab.value === 'guides' ? guideCount.value : productCount.value)
  const pending = computed(() => (tab.value === 'guides' ? guidesStatus : productsStatus).value === 'pending')
  // The engine widened the query when nothing matched it: say so, the
  // results are not the ones that were asked for.
  const relaxedQuery = computed(() => (tab.value === 'guides' ? guides : products).value?.relaxedQuery ?? null)

  function selectTab(value: string | number) {
    navigateTo({ query: stateQuery({ tab: value === 'guides' ? 'guides' : 'products' }) })
  }

  /** A link to the page in another state, e.g. another query or page. */
  const linkTo = (change: Parameters<typeof stateQuery>[0]) => ({ path: route.path, query: stateQuery(change) })
  const pageLink = (target: number) => linkTo({ page: target })

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
    pending,
    relaxedQuery,
    selectTab,
    pageLink,
    changeLimit,
    onProductClick,
    onGuideClick,
  }
}
