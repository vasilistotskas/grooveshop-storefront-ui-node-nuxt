/**
 * The blog's categories for the rail band (`PageSection/BlogCategories.vue`
 * and the tenants' own): the band owns the request, because the band decides
 * whether to draw at all, and a band with no categories paints nothing.
 *
 * Gated on the `blog` feature, and the REQUEST is what is gated: a store
 * with the blog off fetches nothing. The key is read from one place per
 * store, so the page size is the drawing's own.
 */
export async function useBlogCategoryRail(options: { pageSize: MaybeRefOrGetter<number> }) {
  const { locale } = useNuxtApp().$i18n
  const enabled = useStoreFeature('blog')
  const pageSize = computed(() => toValue(options.pageSize))

  const { data } = await useApi('/api/blog/categories', {
    key: 'blogCategories-slider',
    query: { pageSize, languageCode: locale },
    dedupe: 'defer',
    enabled,
    // The band hydrates when it scrolls into view, after the app has
    // finished hydrating — see app/utils/payloadCachedData.ts.
    getCachedData: payloadCachedData,
  })

  const categories = computed(() => (enabled.value && data.value?.results) || [])
  const hasCategories = computed(() => categories.value.length > 0)

  return { categories, hasCategories }
}
