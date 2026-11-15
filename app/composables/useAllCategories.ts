import type { ProductCategory } from '~~/shared/openapi/types.gen'

/**
 * The store's whole category list, ONE entry for every reader that needs
 * all of it: the product filters, the category path of a product. They
 * used to hold it under two keys (`category-menu` and
 * `all-categories-<locale>`), so a listing page fetched it twice and
 * serialised it into its payload twice. The menus, on every page, read
 * their own two-level cut of the same cached route (`useCategoryMenu`),
 * so the whole list is in the payload only of the pages that use it.
 *
 * No locale in the key: the response carries every translation and is
 * byte-identical whatever `X-Language` says (checked 2026-09-25); readers
 * pick a name with `extractTranslated`.
 *
 * The REQUEST is gated, not just the render: a store with the catalogue
 * switched off must not fetch a category list at all (see
 * `.claude/rules/ui-and-pages.md`). The listings are gated by the same
 * flag (`shared/utils/gatedRoutes.ts`), so a filter never needs it while
 * it is off.
 */
export function useAllCategories() {
  const catalogueEnabled = useStoreFeature('catalogue')

  return useApi<ProductCategory[]>('/api/products/categories/all', {
    key: 'all-categories',
    dedupe: 'defer',
    enabled: catalogueEnabled,
  })
}
