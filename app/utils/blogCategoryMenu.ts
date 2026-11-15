import type { BlogCategory } from '~~/shared/openapi/types.gen'

/** How many topics a menu lists. */
const MAX_TOPICS = 8

/**
 * The blog's categories as the menus draw them, in `locale`: the
 * top-level topics, at most eight ("all articles" carries the rest),
 * each with its page, picture and post count, and nothing else.
 */
export function blogCategoryMenu(categories: readonly BlogCategory[], locale: string): BlogCategoryMenuEntry[] {
  return categories
    .filter(category => category.parent == null)
    .slice(0, MAX_TOPICS)
    .map(category => ({
      id: category.id,
      label: extractTranslated(category, 'name', locale) ?? category.slug,
      to: blogCategoryPath(category.id, category.slug),
      imagePath: category.mainImagePath,
      postCount: category.postCount,
    }))
}
