// Cached: setting lookups are the hottest SSR dependency — a single
// homepage render fires several (BUSINESS_HOURS, STORE_GEO_*, feature
// flags), each of which cost a 50-800ms Django round trip and stacked
// into ~1.7s TTFB (PSI mobile score 59, 2026-08-28). Settings are
// tenant-level (never per-user), so a short SWR window is safe; the
// tight maxAge keeps kill-switch flips (e.g. CHAT_WIDGET_ENABLED)
// propagating within ~a minute, and Django's Cache Management purge
// covers the urgent case.
export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zApiV1SettingsGetRetrieveQuery.parse)
    // useBackendFetch: Django must see X-Forwarded-Host to resolve the
    // tenant schema — a raw $fetch would serve the PUBLIC schema's value
    // for every tenant, turning per-tenant extra_settings (e.g. the
    // CHAT_WIDGET_ENABLED kill switch) platform-global (N1 pattern in
    // MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/settings/get`,
      {
        method: 'GET',
        query,
      },
    )
    return await parseDataAs(response, zApiV1SettingsGetRetrieveResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'settingsGet',
  maxAge: 60,
  staleMaxAge: 60 * 10,
  swr: true,
  getKey: event => tenantCacheKey(event, `settings:get:${getQuery(event).key}`),
})
