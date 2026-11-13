/**
 * The design system this store's pages are drawn in (`resolveDesign`): `volt`
 * for every store on the platform's design, `null` for a store with its own
 * (webside), which renders with the base stylesheet.
 *
 * For a SHARED section whose look differs between the two in more than tokens
 * (its type scale, its layout): it keeps Volt's classes under `volt` and draws
 * the base design's own otherwise, so neither design's look moves when the
 * other's does. Known on the server from the tenant, so the server render and
 * the browser agree.
 */
export function useStorefrontDesign() {
  const tenantStore = useTenantStore()
  return computed(() => resolveDesign(tenantStore.schemaName))
}
