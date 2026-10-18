/**
 * Whether a store feature is on — the ONE reader of
 * `TenantConfig.features`, for components, composables and route
 * middleware alike (the tenant is resolved before any of them runs).
 *
 * Synchronous and never fetched: the answer is in the tenant payload
 * every render already has, so there is no loading state and no
 * fallback to choose. See `shared/utils/storeFeature.ts`.
 */
export function useStoreFeature(name: StoreFeatureName) {
  const tenantStore = useTenantStore()
  return computed(() => storeFeatureOn(tenantStore.config, name))
}
