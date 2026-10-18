/**
 * Factories for the route middlewares that gate a page, and the ONE
 * way a page answers "this store does not have that": a hard 404, so
 * the page is indistinguishable from a route that never existed.
 */

/**
 * Gate a page behind a store feature. Synchronous — the decision is
 * `TenantConfig.features`, already on the render — and the same one
 * the API, the menus and the sitemap apply (`useStoreFeature`).
 */
export function createFeatureGate(name: StoreFeatureName) {
  return defineNuxtRouteMiddleware(() => {
    if (useStoreFeature(name).value) return

    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  })
}

/**
 * Gate a page behind a merchant preference (`CART_ENABLED`,
 * `CATALOGUE_ENABLED`: not store features yet, see
 * `shared/utils/storePreference.ts`).
 *
 * Fails OPEN when the settings endpoint cannot be read: an outage must
 * not take the shop down for the stores that sell. What a missing row
 * means is the preference's own default.
 */
export function createPreferenceGate(name: StorePreferenceName) {
  return defineNuxtRouteMiddleware(async () => {
    if (await storePreferenceEnabled(name)) return

    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  })
}
