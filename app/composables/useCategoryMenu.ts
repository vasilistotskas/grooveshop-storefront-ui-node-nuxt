/**
 * The category tree as a two-level menu: the header's Shop dropdown and
 * the phone menus' catalogue, in every design.
 *
 * Its own request, shaped for the menu before it reaches the payload
 * (`transform`): the menus sit on every page, so what they read is
 * serialised into the HTML of every SWR-cached page, and the whole
 * category list (every field, every translation, every level) was paid
 * on every route for at most eight entries. The listing pages read the
 * whole list for their filters under `useAllCategories`'s key; both are
 * one cached route on the server.
 *
 * The REQUEST is gated on the catalogue: a store without it asks for
 * nothing.
 */
export interface CategoryMenuEntry {
  id: number
  slug: string
  label: string
  to: string
  imagePath: string
  /** The alt text the store wrote; empty when the name beside it says it all. */
  imageAlt: string
  /** Products in this category and every descendant. */
  productCount: number
  children: CategoryMenuEntry[]
}

export function useCategoryMenu() {
  const { locale } = useI18n({ useScope: 'global' })
  const catalogueEnabled = useStoreFeature('catalogue')

  const { data } = useApi('/api/products/categories/all', {
    key: computed(() => `category-menu-${locale.value}`),
    dedupe: 'defer',
    enabled: catalogueEnabled,
    // Read by menus that mount after hydration too (the phone menus).
    getCachedData: payloadCachedData,
    transform: categories => categoryMenu(categories, locale.value),
  })

  const entries = computed<CategoryMenuEntry[]>(() => (catalogueEnabled.value ? data.value ?? [] : []))

  return {
    categories: entries,
    hasCategories: computed(() => entries.value.length > 0),
  }
}
