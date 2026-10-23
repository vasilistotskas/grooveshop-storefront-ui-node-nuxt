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
 * Gate a page behind a store preference (`cart`, `catalogue`: not store
 * features yet, see `shared/utils/storePreference.ts`). Synchronous like
 * the feature gate: the decision is `TenantConfig.preferences`, already
 * on the render.
 */
export function createPreferenceGate(name: StorePreferenceName) {
  return defineNuxtRouteMiddleware(() => {
    if (useStorePreference(name).value) return

    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  })
}
