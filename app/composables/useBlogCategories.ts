/** One page of this size holds a store's whole category list. */
const BLOG_CATEGORIES_LIMIT = 100

/**
 * The blog's categories, ONE entry for every reader: the index's filter
 * pills, the names a band of posts shows under each post and the category
 * rail. They used to hold it under three keys with three page sizes, so a
 * page with two of them asked Django for the same list twice. A reader
 * that wants fewer slices the list.
 *
 * Returns the request without awaiting it, so a caller starts it beside
 * its other requests and awaits them together.
 *
 * Gated on the `blog` feature, and the REQUEST is what is gated: a store
 * with the blog off fetches nothing. The bands that read it hydrate
 * lazily, so the payload is read after hydration too (`payloadCachedData`).
 */
export function useBlogCategories() {
  const { locale } = useNuxtApp().$i18n
  const enabled = useStoreFeature('blog')

  const request = useApi('/api/blog/categories', {
    key: computed(() => `blog-categories-${locale.value}`),
    query: computed(() => ({ pageSize: BLOG_CATEGORIES_LIMIT, languageCode: locale.value })),
    dedupe: 'defer',
    enabled,
    getCachedData: payloadCachedData,
  })

  const categories = computed(() => (enabled.value ? request.data.value?.results ?? [] : []))

  return { request, categories }
}
