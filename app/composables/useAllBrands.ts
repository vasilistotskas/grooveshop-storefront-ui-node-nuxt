import type { Brand } from '~~/shared/openapi/types.gen'

/**
 * The store's brands that have an active product, ONE entry for every
 * reader: the brand filter's options and its chips, both of which
 * hold only the ids the search's `brand` facet counts.
 *
 * Gated like `useAllCategories`: a store with the catalogue switched off
 * must not fetch a brand list at all.
 */
export function useAllBrands() {
  const catalogueEnabled = useSettingFlag('CATALOGUE_ENABLED', {
    fallback: true,
  })

  return useApi<Brand[]>('/api/products/brands/all', {
    key: 'all-brands',
    dedupe: 'defer',
    immediate: catalogueEnabled.value,
    server: catalogueEnabled.value,
  })
}
