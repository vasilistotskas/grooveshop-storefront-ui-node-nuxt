import type { ProductCategory } from '~~/shared/openapi/types.gen'

/**
 * The store's whole category list, ONE entry for every reader: the
 * header's Shop menu, the mobile menu, the category band and the product
 * filters. They used to hold it under two keys (`category-menu` and
 * `all-categories-<locale>`), so a listing page fetched it twice and
 * serialised it into its payload twice.
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
  const catalogueEnabled = useSettingFlag('CATALOGUE_ENABLED', {
    fallback: true,
  })

  return useApi<ProductCategory[]>('/api/products/categories/all', {
    key: 'all-categories',
    dedupe: 'defer',
    immediate: catalogueEnabled.value,
    server: catalogueEnabled.value,
  })
}
