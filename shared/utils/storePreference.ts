/**
 * Whether a store preference is on: Django's answer in
 * `TenantConfig.preferences`, read like `storeFeatureOn` reads features.
 *
 * A preference is a store switch the API does not refuse on (Django's
 * docs/store-features.md):
 *
 * - presentation preferences, class (b): a UI choice with no API
 *   surface (`mobileBottomNav`, `stickyAddToCart`, `recentlyViewed`,
 *   `demoAccount`).
 * - `cart` and `catalogue`: store features in every sense but one,
 *   Django's API does not gate them yet. They move to `features` once
 *   the agent gateway reads them (grooveshop-agent-gateway issue 27).
 *
 * The answer is in the tenant payload every render already has, so it
 * costs no request and has no fallback to choose. The names come from
 * the generated type. A store with no resolved tenant has none of them,
 * as Django answers for the platform host.
 */
export type StorePreferenceName = keyof TenantConfig['preferences']

export function storePreferenceOn(
  tenant: Pick<TenantConfig, 'preferences'> | null | undefined,
  name: StorePreferenceName,
): boolean {
  return tenant?.preferences[name] ?? false
}
