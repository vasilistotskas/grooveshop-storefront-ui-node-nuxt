/**
 * Min/max statistics of one numeric search facet (`likes_count`,
 * `view_count`), for the slider that filters by it. One request per facet
 * and language, shared by every reader of the key.
 */
const FACET_KEYS = {
  likes_count: 'likes-facets',
  view_count: 'views-facets',
} as const

export function useProductFacetStats(facet: keyof typeof FACET_KEYS) {
  const { locale } = useNuxtApp().$i18n

  return useApi('/api/products/search', {
    query: {
      facets: facet,
      limit: 1,
      languageCode: locale.value,
    },
    key: `${FACET_KEYS[facet]}-${locale.value}`,
  })
}
