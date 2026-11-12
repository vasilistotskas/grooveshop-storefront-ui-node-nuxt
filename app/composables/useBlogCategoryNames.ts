/**
 * Each blog category's name in the page's language, and its page's path at
 * its current slug, by id: for a band of posts, which carries only its posts'
 * category ids and its rule's category id.
 *
 * Gated on the `blog` feature, and the REQUEST is what is gated: a
 * store with the blog off fetches nothing.
 */
export async function useBlogCategoryNames() {
  const { $i18n } = useNuxtApp()
  const { request, categories } = useBlogCategories()
  await request

  const byId = computed(() => new Map(categories.value.map(category => [category.id, category])))

  return {
    name: (id: number): string | undefined => {
      const category = byId.value.get(id)
      return (category && extractTranslated(category, 'name', $i18n.locale.value)) || undefined
    },
    path: (id: number): string | undefined => {
      const category = byId.value.get(id)
      return category ? blogCategoryPath(category.id, category.slug) : undefined
    },
  }
}
