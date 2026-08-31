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

  // useRequestFetch forwards the incoming host during SSR — a bare
  // $fetch would resolve the wrong tenant (see loyalty-enabled.ts).
  const requestFetch = useRequestFetch()

  let runtimeEnabled: boolean
  try {
    const setting = await requestFetch<{ value?: string }>('/api/settings/get', {
      query: { key: 'B2B_WHOLESALE_ENABLED' },
    })
    runtimeEnabled = ['true', '1', 'yes'].includes(
      (setting?.value ?? '').toLowerCase(),
    )
  }
  catch {
    // Fail CLOSED — a settings hiccup must hide the commercial
    // program, never expose it (contrast loyalty-enabled.ts).
    runtimeEnabled = false
  }

  if (!runtimeEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
