/**
 * Whether a link to a gated route may be shown: the page behind it is
 * serving for this store.
 *
 * Reads `shared/utils/gatedRoutes.ts`, the table the sitemap and the
 * operator menus (`useNavigation`) already read, so a hard-coded menu
 * link and the page's route middleware cannot disagree. A path the
 * table does not list is always served. Synchronous: the answer is in
 * the tenant payload.
 */
export function useGatedRoute(path: string) {
  const tenantStore = useTenantStore()
  return computed(() => !isFeaturePathBlocked(path, blockedFeaturePaths(tenantStore.config)))
}
