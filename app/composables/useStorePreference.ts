/**
 * Whether a store preference is on, the ONE reader of
 * `TenantConfig.preferences` for components, composables and route
 * middleware (`shared/utils/storePreference.ts`). A store FEATURE is read
 * with `useStoreFeature`, never here.
 *
 * Synchronous and never fetched, like `useStoreFeature`. A plugin, which
 * runs before the tenant store is filled, reads the tenant state instead:
 * `storePreferenceOn(useTenant().value, name)`.
 */
export function useStorePreference(name: StorePreferenceName) {
  const tenantStore = useTenantStore()
  return computed(() => storePreferenceOn(tenantStore.config, name))
}
