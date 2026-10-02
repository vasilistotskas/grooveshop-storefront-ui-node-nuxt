/**
 * Each blog category's name in the page's language, by id — for a band
 * of posts, which carry only their category's id.
 *
 * Gated on the tenant's blog flag, and the REQUEST is what is gated: a
 * store with the blog off fetches nothing.
 */
export async function useBlogCategoryNames() {
  const { $i18n } = useNuxtApp()
  const locale = $i18n.locale
  const enabled = useTenantStore().blogEnabled

  const { data } = await useApi('/api/blog/categories', {
    key: computed(() => `blog-category-names-${locale.value}`),
    query: computed(() => ({ pageSize: 100, languageCode: locale.value })),
    dedupe: 'defer',
    immediate: enabled,
    server: enabled,
    // The band hydrates when it scrolls into view, after the app has
    // finished hydrating — see app/utils/payloadCachedData.ts.
    getCachedData: payloadCachedData,
  })

  const names = computed(() => new Map(
    (enabled ? data.value?.results ?? [] : []).map(category => [
      category.id,
      extractTranslated(category, 'name', locale.value) ?? '',
    ]),
  ))

  return (id: number): string | undefined => names.value.get(id) || undefined
}
