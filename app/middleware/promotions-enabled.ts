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

  // useRequestFetch forwards the incoming host during SSR (a bare
  // $fetch stamps host: localhost and the tenant middleware 404s —
  // see gift-cards-enabled.ts).
  const requestFetch = useRequestFetch()

  let runtimeEnabled: boolean
  try {
    const setting = await requestFetch<{ value?: string }>(
      '/api/settings/get',
      { query: { key: 'PROMOTIONS_ENABLED' } },
    )
    runtimeEnabled = (setting?.value ?? 'false').toLowerCase() === 'true'
  }
  catch {
    // Fail OPEN on fetch failure — an unavailable extra_settings
    // endpoint must not take the page down for stores whose plan
    // enables it. Django still gates the data itself.
    return
  }

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
