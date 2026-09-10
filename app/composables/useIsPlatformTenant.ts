/**
 * Whether the current request/tenant IS the platform's own storefront.
 *
 * Used to gate platform-specific bundled content (brand assets,
 * marketing banners, platform-verification meta) that must never
 * render on other tenants' domains. The decision is made on the server
 * by the tenant plugin against PRIVATE runtime config and reaches the
 * client as a boolean — no hostname to compare against here, and none
 * in the payload. See shared/utils/platformTenant.ts for the rule.
 */
export function useIsPlatformTenant() {
  const tenantStore = useTenantStore()
  return computed(() => tenantStore.isPlatform)
}
