/**
 * Middleware to check if the offers page is accessible.
 *
 * Two-tier gate (both must be true), the gift-cards pattern:
 *  1. Tenant plan flag — `TenantConfig.promotionsEnabled` (commercial gate).
 *  2. Runtime toggle  — `extra_settings.PROMOTIONS_ENABLED` (operational gate).
 *
 * Either being false results in a hard 404 so the feature's existence
 * is not leaked to tenants/users for whom it is disabled. The Django
 * endpoint enforces the same two tiers with the same 404 semantics, so
 * this is the fast path rather than the only guard.
 *
 * Note the runtime default here is `'false'`, not `'true'`: the
 * PROMOTIONS_ENABLED extra-setting ships OFF, so a store that has
 * never touched it must not get an offers page.
 */
export default defineNuxtRouteMiddleware(async () => {
  const tenantStore = useTenantStore()

  if (!tenantStore.promotionsEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Ships OFF (`fallback: false`); an unreadable settings endpoint
  // fails OPEN (`onError: true`) — an outage must not take the page
  // down for stores whose plan enables it. Django still gates the
  // data itself.
  const runtimeEnabled = await settingEnabled('PROMOTIONS_ENABLED', {
    fallback: false,
    onError: true,
  })

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
