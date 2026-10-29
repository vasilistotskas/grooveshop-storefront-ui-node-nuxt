/**
 * Each blog category's name in the page's language, by id — for a band
 * of posts, which carry only their category's id.
 *
 * Gated on the `blog` feature, and the REQUEST is what is gated: a
 * store with the blog off fetches nothing.
 */
export async function useBlogCategoryNames() {
  const { $i18n } = useNuxtApp()
  const { request, categories } = useBlogCategories()
  await request

  const names = computed(() => new Map(categories.value.map(category => [
    category.id,
    extractTranslated(category, 'name', $i18n.locale.value) ?? '',
  ])))

  return (id: number): string | undefined => names.value.get(id) || undefined
}
