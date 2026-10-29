/** How many results of each kind one request of the quick search asks for. */
const QUICK_SEARCH_LIMIT = 3

/**
 * The search palette's data: what the shop is searching for, the engine's
 * answer for what the shopper typed (asked for 200 ms after the last
 * keystroke, by `execute`, one page at a time), and the way on to the full
 * results page.
 *
 * Shared by every drawing of the palette (`Search/Modal.vue` and the
 * tenants' own); each decides when to `execute` (a request this makes
 * only when told to, bar the trending queries, which the first open asks
 * for) and how to show the rows. Call it from a
 * `<script setup>`.
 */
export function useQuickSearch(options: { query: Ref<string>, open: MaybeRefOrGetter<boolean> }) {
  const { locale } = useNuxtApp().$i18n
  const router = useRouter()
  const localePath = useLocalePath()
  // The palette searches the catalogue: a store without one asks for
  // neither the trending queries nor results (Django answers 404).
  const catalogueEnabled = useStoreFeature('catalogue')

  const trending = useLazyApi<{
    windowHours: number
    contentType: string
    languageCode: string | null
    results: { query: string, count: number }[]
  }>('/api/search/trending', {
    query: { languageCode: locale, contentType: 'product', limit: 8 },
    immediate: false,
    enabled: catalogueEnabled,
    watch: false,
    server: false,
    default: () => ({ windowHours: 24, contentType: 'product', languageCode: null, results: [] }),
  })

  // The palette is mounted on every page, so asking at setup is a request
  // for every visitor who never opens it: the first open asks, once.
  watch(() => toValue(options.open), (open) => {
    if (open && trending.status.value === 'idle') void trending.execute()
  }, { immediate: true })

  const debouncedQuery = refDebounced(options.query, 200)
  const offset = ref(0)

  const { data: searchResults, status, execute, clear } = useLazyApi<SearchResponse>('/api/search', {
    query: {
      query: debouncedQuery,
      languageCode: locale,
      limit: QUICK_SEARCH_LIMIT,
      offset,
    },
    immediate: false,
    enabled: catalogueEnabled,
    watch: false,
  })

  /**
   * Through localePath: a bare '/search' dropped the /en prefix, so an
   * English quick search opened the Greek results page, which found
   * nothing for an English word.
   */
  function goToSearchPage(query: string) {
    return router.replace(localePath({ name: 'search', query: { query } }))
  }

  return {
    limit: QUICK_SEARCH_LIMIT,
    trending,
    debouncedQuery,
    offset,
    searchResults,
    status,
    execute,
    clear,
    goToSearchPage,
  }
}
