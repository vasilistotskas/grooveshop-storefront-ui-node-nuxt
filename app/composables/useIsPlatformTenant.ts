/**
 * Whether the current tenant IS the platform's own storefront.
 *
 * Gates the bundled brand assets (navbar wordmark, favicon set, OG
 * card, login mark) and the platform-only marketing content that must
 * never render on another store's domain. The source of truth is the
 * ``Tenant.is_platform_storefront`` row flag delivered in the resolve
 * payload — nothing here compares hostnames, and no env value names a
 * store. See ``useTenantStore().isPlatform`` for the absent-tenant rule.
 */
export function useIsPlatformTenant() {
  const tenantStore = useTenantStore()
  return computed(() => tenantStore.isPlatform)
}
