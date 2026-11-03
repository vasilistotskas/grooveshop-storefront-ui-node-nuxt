import type { BlockUpgrade } from '../types/builder'

/**
 * The upgrades that move a block's list settings onto a data setting
 * (`builderField.query`): what version 1 of a rail spread over `ordering`,
 * `categoryId` and a count becomes the one descriptor it stands for.
 *
 * Only settings that are the same in every language move here. A setting a
 * store translates cannot be renamed by an upgrade: the translations are kept
 * by setting pointer, outside the node, and a pointer the block no longer has
 * is refused on save.
 */

/** What the first product rails called their orderings, and what each one sorted by. `featured` was the view count, not an arrangement of the merchant's. */
export const LEGACY_PRODUCT_ORDERING = {
  featured: 'mostViewed',
  newest: 'newest',
  popular: 'mostLiked',
  discounted: 'discounted',
  rating: 'topRated',
} as const

type LegacyProductOrdering = keyof typeof LEGACY_PRODUCT_ORDERING

const isLegacyOrdering = (value: unknown): value is LegacyProductOrdering =>
  typeof value === 'string' && value in LEGACY_PRODUCT_ORDERING

/**
 * Version 1 of a product rail (`ordering`, `categoryId`, `pageSize`) to
 * version 2 (`products`). A rail that named no ordering or no size had the
 * component's own, which `defaults` states for this block, so what it drew
 * is what it still draws. `columns` of `featured_products` never changed
 * what was drawn (the page size always won), and is dropped. A size above
 * what a descriptor may list is cut to it.
 */
export function upgradeProductRail(defaults: { ordering: LegacyProductOrdering, limit: number }, maxLimit: number): BlockUpgrade {
  return ({ settings, ...body }) => {
    const { ordering, categoryId, pageSize, columns: _columns, ...kept } = settings
    const limit = typeof pageSize === 'number' ? pageSize : defaults.limit
    const products = {
      mode: 'filter',
      ...(typeof categoryId === 'number' && { categories: [categoryId] }),
      ordering: LEGACY_PRODUCT_ORDERING[isLegacyOrdering(ordering) ? ordering : defaults.ordering],
      limit: Math.min(limit, maxLimit),
    }
    return { ...body, settings: { ...kept, products } }
  }
}
