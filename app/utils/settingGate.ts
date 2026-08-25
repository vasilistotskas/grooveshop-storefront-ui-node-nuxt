/**
 * Factory for route middlewares that gate a page behind a boolean
 * merchant extra-setting (single-tier — no Tenant plan flag; contrast
 * app/middleware/loyalty-enabled.ts for the two-tier shape).
 *
 * Disabled means a hard 404 so the page is indistinguishable from a
 * route that never existed. Fails OPEN on fetch failure: an
 * unavailable settings endpoint must not take a page down for stores
 * that have it enabled (every gated setting defaults to enabled).
 */
export function createSettingGate(key: string) {
  return defineNuxtRouteMiddleware(async () => {
    // useRequestFetch forwards the incoming host during SSR — a bare
    // $fetch would resolve the PUBLIC schema's value for every tenant
    // (N1 pattern in MULTI_TENANT_AUDIT.md).
    const requestFetch = useRequestFetch()

    let enabled: boolean
    try {
      const setting = await requestFetch<{ value?: string }>(
        '/api/settings/get',
        { query: { key } },
      )
      enabled = (setting?.value ?? 'true').toLowerCase() === 'true'
    }
    catch {
      return
    }

    if (!enabled) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    }
  })
}
