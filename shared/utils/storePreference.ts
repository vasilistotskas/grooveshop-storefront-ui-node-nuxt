/**
 * Whether a store preference is on: Django's answer in
 * `TenantConfig.preferences`, read like `storeFeatureOn` reads features.
 *
 * A preference is a store switch the API does not refuse on (Django's
 * docs/store-features.md): a UI choice with no API surface
 * (`mobileBottomNav`, `stickyAddToCart`, `recentlyViewed`,
 * `demoAccount`). The cart and the catalogue are store FEATURES
 * (`useStoreFeature`).
 *
 * The answer is in the tenant payload every render already has, so it
 * costs no request and has no fallback to choose. A store with no resolved
 * tenant has none of them, as Django answers for the platform host.
 */
export type StorePreferenceName = keyof TenantConfig['preferences']

export function storePreferenceOn(
  tenant: Pick<TenantConfig, 'preferences'> | null | undefined,
  name: StorePreferenceName,
): boolean {
  return tenant?.preferences[name] ?? false
}
