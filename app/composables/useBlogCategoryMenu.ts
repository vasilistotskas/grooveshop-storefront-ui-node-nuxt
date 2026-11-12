/**
 * The blog's topics as a menu: the header's Blog dropdown and the phone
 * menus' Blog section, in every design. The blog's counterpart of
 * `useCategoryMenu`, and shaped the same way: its own request, cut down
 * to what the menus draw before it reaches the payload (`transform`),
 * since the menus sit on every page. The blog's own pages read the
 * whole list under `useBlogCategories`'s key; both are one cached route
 * on the server.
 *
 * Gated on the `blog` feature, and the REQUEST is what is gated: a
 * store with the blog off asks for nothing. A list that failed to load
 * is an empty menu.
 */
export interface BlogCategoryMenuEntry {
  id: number
  label: string
  /** The topic's page, before the locale prefix. */
  to: string
  imagePath: string
  /** Published posts in the topic. */
  postCount: number
}

export function useBlogCategoryMenu() {
  const { locale } = useI18n({ useScope: 'global' })
  const enabled = useStoreFeature('blog')

  const { data } = useApi('/api/blog/categories', {
    key: computed(() => `blog-category-menu-${locale.value}`),
    query: computed(() => ({ pageSize: BLOG_CATEGORIES_LIMIT, languageCode: locale.value })),
    dedupe: 'defer',
    enabled,
    // Read by menus that mount after hydration too (the phone menus).
    getCachedData: payloadCachedData,
    transform: page => blogCategoryMenu(page.results, locale.value),
  })

  const entries = computed<BlogCategoryMenuEntry[]>(() => (enabled.value ? data.value ?? [] : []))

  return {
    blogCategories: entries,
    hasBlogCategories: computed(() => entries.value.length > 0),
  }
}
