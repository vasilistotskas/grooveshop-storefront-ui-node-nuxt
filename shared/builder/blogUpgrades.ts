import type { BlockUpgrade } from '../types/builder'

/**
 * The upgrades that move the blog's bands onto a data setting
 * (`builderField.query`).
 */

/**
 * Version 1 of a band of blog posts (`categoryId`, and the size under the name
 * its block gave it: `count` for the grid and the carousel, `pageSize` for the
 * list) to version 2 (`posts`): the latest, in a category when it named one.
 * A band that named no size had the component's own, which `defaultLimit`
 * states; a size above what a list may carry is cut to it.
 */
export function upgradeBlogRail(defaultLimit: number, maxLimit: number): BlockUpgrade {
  return ({ settings, ...body }) => {
    const { categoryId, count, pageSize, ...kept } = settings
    const size = [pageSize, count].find((value): value is number => typeof value === 'number') ?? defaultLimit
    const posts = {
      mode: 'filter',
      ...(typeof categoryId === 'number' && { category: categoryId }),
      ordering: 'newest',
      limit: Math.min(size, maxLimit),
    }
    return { ...body, settings: { ...kept, posts } }
  }
}

/** Version 1 of the blog's categories band, which drew the first `limit` of them (its component's page size): the same, as a list it can be told the size of. */
export function upgradeBlogCategories(limit: number): BlockUpgrade {
  return ({ settings, ...body }) => ({ ...body, settings: { ...settings, categories: { limit } } })
}
