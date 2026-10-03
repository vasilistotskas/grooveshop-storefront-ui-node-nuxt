import type { ProductCategory } from '~~/shared/openapi/types.gen'

/**
 * The category tree a listing page draws: the filter column's nested
 * links, the chips under the title and the breadcrumb trail.
 *
 * Counts come from the search's `category` facet, which files each
 * product under its OWN category only. Summed over a subtree they read
 * as the products anywhere beneath a category — what "Charging 28"
 * means on the board — which the category list does not return.
 */
export interface CategoryNode {
  id: number
  slug: string
  label: string
  to: string
  /** Products in this category and every descendant; `null` before the facet has answered. */
  count: number | null
  children: CategoryNode[]
}

/**
 * The store's categories as a forest, siblings in the list's own order
 * (the API sorts by `sort_order`). An inactive category drops out with
 * everything under it, as it does from the header menu.
 *
 * `directCounts` is the facet distribution, keyed by category id. Pass
 * `undefined` while it is unknown: every count is then `null` and
 * nothing is pruned. Once known, a category with no products is left out
 * — a link to an empty listing is a dead end — unless it is `currentId`
 * or one of its ancestors: the page's own place in the tree stays drawn
 * when a filter empties it.
 */
export function buildCategoryForest(
  categories: readonly ProductCategory[],
  locale: string,
  directCounts: Readonly<Record<string, number>> | undefined,
  currentId?: number,
): CategoryNode[] {
  const byParent = new Map<number | null, ProductCategory[]>()
  const parentOf = new Map<number, number | null>()
  for (const category of categories) {
    if (category.active === false) continue
    const parent = category.parent ?? null
    parentOf.set(category.id, parent)
    const siblings = byParent.get(parent)
    if (siblings) siblings.push(category)
    else byParent.set(parent, [category])
  }

  const keep = new Set<number>()
  for (let id = currentId ?? null; id !== null && !keep.has(id); id = parentOf.get(id) ?? null) {
    keep.add(id)
  }

  const build = (category: ProductCategory): CategoryNode => {
    const children = (byParent.get(category.id) ?? []).map(build)
    const count = directCounts
      ? children.reduce((sum, child) => sum + (child.count ?? 0), directCounts[category.id] ?? 0)
      : null
    return {
      id: category.id,
      slug: category.slug,
      label: extractTranslated(category, 'name', locale) ?? category.slug,
      to: categoryUrl(category.id, category.slug),
      count,
      children,
    }
  }

  const prune = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes
      .filter(node => node.count === null || node.count > 0 || keep.has(node.id))
      .map(node => ({ ...node, children: prune(node.children) }))

  return prune((byParent.get(null) ?? []).map(build))
}

/** A category's listing page, before the locale prefix. */
export function categoryUrl(id: number, slug: string) {
  return `/products/category/${id}/${slug}`
}

/** The nodes from a root down to `id`, both ends included; empty when `id` is not in the forest. */
export function categoryTrail(forest: readonly CategoryNode[], id: number): CategoryNode[] {
  for (const node of forest) {
    if (node.id === id) return [node]
    const below = categoryTrail(node.children, id)
    if (below.length) return [node, ...below]
  }
  return []
}
