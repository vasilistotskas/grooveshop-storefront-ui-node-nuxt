/**
 * Whether the current request/tenant IS the platform's own storefront.
 *
 * Used to gate platform-specific hardcoded content (marketing banners,
 * platform-verification meta) that must never render on other tenants'
 * domains. An unset primaryDomain (local dev, tests) counts as
 * platform so single-tenant setups keep today's behaviour.
 */
export function useIsPlatformTenant() {
  const config = useRuntimeConfig()
  const tenantStore = useTenantStore()
  return computed(() => {
    const primary = tenantStore.primaryDomain
    if (!primary) return true
    try {
      return new URL(config.public.baseUrl as string).host.replace(/:\d+$/, '') === primary
    }
    catch {
      return true
    }
  })
}
