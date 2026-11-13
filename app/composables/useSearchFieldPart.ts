/**
 * The store's search field for a shared section (the hero's, the search
 * band's): its design's own field and the palette it opens, the same search
 * the header opens (`search_field`, `resolvePart`). One search per page,
 * whichever field a shopper uses.
 */
export function useSearchFieldPart() {
  const tenantStore = useTenantStore()
  return computed(() => resolvePart('search_field', tenantStore.schemaName))
}
