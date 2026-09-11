/**
 * Middleware gating the wholesale/B2B program pages.
 *
 * Two-tier gate (both must be true):
 *  1. Tenant plan flag — `TenantConfig.b2bEnabled` (commercial gate).
 *  2. Runtime toggle  — `extra_settings.B2B_WHOLESALE_ENABLED`.
 *
 * Unlike the loyalty gate this fails CLOSED on a fetch failure: the
 * setting ships `False` by default and gates a commercial program, so a
 * transient settings-API error must hide the page, never expose it
 * (the promotions/gift-cards posture).
 */
export default defineNuxtRouteMiddleware(async () => {
  const tenantStore = useTenantStore()

  if (!tenantStore.b2bEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Fails CLOSED on a missing row AND on a settings hiccup — a
  // commercial program is hidden, never exposed (contrast the
  // gift-cards/promotions `onError: true`).
  const runtimeEnabled = await settingEnabled('B2B_WHOLESALE_ENABLED', {
    fallback: false,
  })

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
