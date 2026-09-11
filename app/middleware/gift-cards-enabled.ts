/**
 * Middleware to check if the gift-cards feature is accessible.
 *
 * Two-tier gate (both must be true), the loyalty-enabled pattern:
 *  1. Tenant plan flag — `TenantConfig.giftCardsEnabled` (commercial gate).
 *  2. Runtime toggle  — `extra_settings.GIFT_CARDS_ENABLED` (operational gate).
 *
 * Either being false results in a hard 404 so the feature's existence is
 * not leaked to tenants/users for whom it is disabled.
 *
 * The runtime toggle ships OFF (`fallback: false`); an unreadable
 * settings endpoint fails OPEN (`onError: true`) so an outage never
 * takes the feature down for tenants whose plan enables it.
 */
export default defineNuxtRouteMiddleware(async () => {
  const tenantStore = useTenantStore()

  if (!tenantStore.giftCardsEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const runtimeEnabled = await settingEnabled('GIFT_CARDS_ENABLED', {
    fallback: false,
    onError: true,
  })

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
