import type { ProductCategory } from '~~/shared/openapi/types.gen'

/**
 * The category tree as a two-level menu: the header's Shop dropdown and
 * the mobile menu's catalogue tab read the same shape.
 *
 * Two levels, and a cap on each, on purpose. The whole tree is
 * serialised into the HTML of every SWR-cached page, so a store with a
 * deep catalogue would pay for its depth on every route while a shopper
 * reads at most one screenful of it. "All categories" carries the rest.
 *
 * The REQUEST is gated, not just the render: a store with the catalogue
 * switched off must not fetch a category list at all (see
 * `.claude/rules/ui-and-pages.md` — a flag on a computed still fires
 * the fetch).
 */

/** Roots, and how many children each may contribute. */
const MAX_ROOTS = 8
const MAX_CHILDREN = 8

export interface CategoryMenuEntry {
  id: number
  slug: string
  label: string
  to: string
  imagePath: string
  children: CategoryMenuEntry[]
}

export function categoryUrl(id: number, slug: string) {
  return `/products/category/${id}/${slug}`
}

export function useCategoryMenu() {
  const { locale } = useI18n()
  const catalogueEnabled = useSettingFlag('CATALOGUE_ENABLED', {
    fallback: true,
  })

  const { data } = useApi('/api/products/categories/all', {
    key: 'category-menu',
    // Several readers share this key (the header, the mobile menu);
    // the default 'cancel' would re-issue the request per reader.
    dedupe: 'defer',
    immediate: catalogueEnabled.value,
    server: catalogueEnabled.value,
  })

  const entries = computed<CategoryMenuEntry[]>(() => {
    if (!catalogueEnabled.value) return []
    const all = (data.value ?? []) as ProductCategory[]
    if (!all.length) return []

    const byParent = new Map<number | null, ProductCategory[]>()
    for (const category of all) {
      if (category.active === false) continue
      const parent = category.parent ?? null
      const siblings = byParent.get(parent)
      if (siblings) siblings.push(category)
      else byParent.set(parent, [category])
    }

    const build = (category: ProductCategory, depth: number): CategoryMenuEntry => ({
      id: category.id,
      slug: category.slug,
      label: extractTranslated(category, 'name', locale.value) ?? category.slug,
      to: categoryUrl(category.id, category.slug),
      imagePath: category.mainImagePath,
      children:
        depth === 0
          ? (byParent.get(category.id) ?? [])
              .slice(0, MAX_CHILDREN)
              .map(child => build(child, depth + 1))
          : [],
    })

    return (byParent.get(null) ?? []).slice(0, MAX_ROOTS).map(root => build(root, 0))
  })

  return {
    categories: entries,
    hasCategories: computed(() => entries.value.length > 0),
  }
}
