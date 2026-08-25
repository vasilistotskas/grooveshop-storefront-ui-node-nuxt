/**
 * Middleware to check if the gift-cards feature is accessible.
 *
 * Two-tier gate (both must be true), the loyalty-enabled pattern:
 *  1. Tenant plan flag — `TenantConfig.giftCardsEnabled` (commercial gate).
 *  2. Runtime toggle  — `extra_settings.GIFT_CARDS_ENABLED` (operational gate).
 *
 * Either being false results in a hard 404 so the feature's existence is
 * not leaked to tenants/users for whom it is disabled.
 */
export default defineNuxtRouteMiddleware(async () => {
  const tenantStore = useTenantStore()

  if (!tenantStore.giftCardsEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Operational/runtime gate. useRequestFetch forwards the incoming
  // host during SSR (bare $fetch stamps host: localhost and the tenant
  // middleware 404s — see loyalty-enabled.ts).
  const requestFetch = useRequestFetch()

  let runtimeEnabled: boolean
  try {
    const setting = await requestFetch<{ value?: string }>(
      '/api/settings/get',
      { query: { key: 'GIFT_CARDS_ENABLED' } },
    )
    runtimeEnabled = (setting?.value ?? 'false').toLowerCase() === 'true'
  }
  catch {
    // Fail OPEN on fetch failure — an unavailable extra_settings
    // endpoint must not take the feature down for tenants whose plan
    // enables it (loyalty-enabled.ts rationale).
    return
  }

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
