/**
 * The merchant settings that are NOT store features, and what each one
 * reads as while the settings cannot be fetched.
 *
 * `TenantConfig.features` carries every store feature (Django's
 * docs/store-features.md, class (a)). What is left are two kinds of
 * boolean setting, read through ONE typed accessor (`useStorePreference`
 * in components, `storePreferenceEnabled` in plugins and gates):
 *
 * - presentation preferences, class (b): a UI choice with no API
 *   surface to refuse, so there is nothing for Django to resolve.
 * - `CART_ENABLED` and `CATALOGUE_ENABLED`: store features in every
 *   sense but one, Django's API does not gate them yet. The agent
 *   gateway calls the cart and catalogue routes and must read the
 *   feature first, so they move into `features` after that change
 *   (grooveshop-agent-gateway issue 27). Until then they are read here;
 *   when they move, their rows leave this table.
 *
 * Django sends every public key, the store's value or the declared one,
 * so the value here is used only while the settings cannot be fetched:
 * what the page shows during that outage, chosen per preference.
 */
export const STORE_PREFERENCES = {
  MOBILE_BOTTOM_NAV_ENABLED: true,
  STICKY_ADD_TO_CART_ENABLED: true,
  RECENTLY_VIEWED_ENABLED: false,
  DEMO_ACCOUNT_ENABLED: false,
  // Not store features yet: grooveshop-agent-gateway issue 27.
  CART_ENABLED: true,
  CATALOGUE_ENABLED: true,
} as const satisfies Record<string, boolean>

export type StorePreferenceName = keyof typeof STORE_PREFERENCES
