/**
 * Middleware to check if the loyalty feature is accessible.
 *
 * Two-tier gate (both must be true):
 *  1. Tenant plan flag — `TenantConfig.loyaltyEnabled` (commercial gate).
 *  2. Runtime toggle  — `extra_settings.LOYALTY_ENABLED` (operational gate).
 *
 * Either being false results in a hard 404 so the feature's existence is
 * not leaked to tenants/users for whom it is disabled.
 */
export default defineNuxtRouteMiddleware(async () => {
  const tenantStore = useTenantStore()

  // Tenant plan gate — checked synchronously from the store (populated by
  // the tenant plugin before any route middleware runs).
  if (!tenantStore.loyaltyEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Operational/runtime gate — fetched from extra_settings.
  try {
    const settings = await $fetch<{ LOYALTY_ENABLED?: string }>('/api/loyalty/settings', {
      query: { keys: 'LOYALTY_ENABLED' },
    })
    const runtimeEnabled = (settings?.LOYALTY_ENABLED ?? 'false').toLowerCase() === 'true'
    if (!runtimeEnabled) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    }
  }
  catch (error: unknown) {
    // Re-throw createError instances (our own 404s) — do not swallow them.
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    // Network/parse errors: fail open (don't block the page on a transient
    // settings fetch failure) so an unavailable extra_settings endpoint
    // doesn't take down loyalty for tenants with the plan enabled.
  }
})
