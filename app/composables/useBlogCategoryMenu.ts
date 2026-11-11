/**
 * The blog's topics as a menu: the header's Blog dropdown and the phone
 * menu's Blog section, in every design. The blog's counterpart of
 * `useCategoryMenu`.
 *
 * The top-level topics only, capped like the catalogue's roots: the
 * list is serialised into the HTML of every page whose header shows it,
 * and "all articles" carries the rest.
 *
 * Read from `useBlogCategories`, the one reader of the blog's category
 * list, so a blog page that also draws its filter pills asks Django
 * once. That reader gates the REQUEST on the `blog` feature and answers
 * an empty list when it is off or the request failed.
 */

/** How many topics a menu lists. */
const MAX_TOPICS = 8

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
  const { categories } = useBlogCategories()

  const entries = computed<BlogCategoryMenuEntry[]>(() =>
    categories.value
      .filter(category => category.parent == null)
      .slice(0, MAX_TOPICS)
      .map(category => ({
        id: category.id,
        label: extractTranslated(category, 'name', locale.value) ?? category.slug,
        to: blogCategoryPath(category.id, category.slug),
        imagePath: category.mainImagePath,
        postCount: category.postCount,
      })),
  )

  return {
    blogCategories: entries,
    hasBlogCategories: computed(() => entries.value.length > 0),
  }
}
