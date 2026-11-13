/**
 * The tiles of `blog_categories`' `tiles` layout, whatever their look
 * (`PageSection/BlogCategoryTiles`, `PageSection/BlogCategoryTilesBold`): each
 * category's icon (`deriveIconName`, else its picture), name, post count and
 * page; and the link's text with `{count}` read as how many posts the
 * categories hold between them («Όλα τα {count} άρθρα»), so the figure never
 * goes stale.
 */
export function useBlogCategoryTiles(
  props: { categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>, ctaText?: string },
  postsLabel: (count: number) => string,
) {
  const { locale, n } = useI18n({ useScope: 'global' })
  const localePath = useLocalePath()

  const tiles = computed(() => props.categories.items.map(category => ({
    id: category.id,
    name: extractTranslated(category, 'name', locale.value) ?? '',
    icon: deriveIconName(category.mainImagePath) ?? undefined,
    imagePath: category.mainImagePath,
    posts: postsLabel(category.postCount),
    to: localePath({ name: 'blog-category-id-slug', params: { id: category.id, slug: category.slug } }),
  })))

  const ctaLabel = computed(() => {
    if (!props.ctaText?.includes('{count}')) return props.ctaText
    const total = props.categories.items.reduce((sum, category) => sum + category.postCount, 0)
    return props.ctaText.replaceAll('{count}', n(total))
  })

  return { tiles, ctaLabel }
}
