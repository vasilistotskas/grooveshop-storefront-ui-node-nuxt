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
  //
  // useRequestFetch forwards the incoming host during SSR. A bare
  // $fetch would not: Nitro stamps host: "localhost" on an internal
  // request, server/middleware/0.tenant.ts fails to resolve a store and
  // answers 404, and the catch below would turn that into a hard 404 for
  // the page — so this route was unreachable for every tenant that had
  // loyalty switched on.
  const requestFetch = useRequestFetch()

  let runtimeEnabled: boolean
  try {
    const settings = await requestFetch<{ LOYALTY_ENABLED?: string }>('/api/loyalty/settings', {
      query: { keys: 'LOYALTY_ENABLED' },
    })
    runtimeEnabled = (settings?.LOYALTY_ENABLED ?? 'false').toLowerCase() === 'true'
  }
  catch {
    // Fail OPEN on any fetch failure, which is what this gate has always
    // meant to do: an unavailable extra_settings endpoint must not take
    // loyalty down for tenants whose plan enables it. The previous
    // implementation re-threw anything carrying a `statusCode`, and every
    // ofetch FetchError carries one — so the fail-open branch was
    // unreachable and any upstream 4xx/5xx hard-404'd the page.
    //
    // Throwing our own 404 from inside the try is what made that
    // necessary; the decision is now taken after the try instead.
    return
  }

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
