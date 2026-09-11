// The store's public ``extra_settings`` in ONE payload — the only
// settings read the storefront makes per render (``useStoreSettings``).
//
// Cached per tenant: settings are store-level (never per-user), so the
// SWR window is safe, and the tight maxAge keeps kill-switch flips
// (e.g. CHAT_WIDGET_ENABLED) propagating within ~a minute. Django's
// Cache Management purge (``settingsPublic``) covers the urgent case.
// Under this route Django answers once a minute per store instead of
// once per key per render, which is the load that saturated the
// storefront under a crawler burst (2026-09-11).
export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    // useBackendFetch: Django must see X-Forwarded-Host to resolve the
    // tenant schema — a raw $fetch would serve the PUBLIC schema's values
    // for every tenant (N1 pattern in MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/settings/public`,
      { method: 'GET' },
    )
    return await parseDataAs(response, zApiV1SettingsPublicRetrieveResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'settingsPublic',
  maxAge: 60,
  staleMaxAge: 60 * 10,
  swr: true,
  getKey: event => tenantCacheKey(event, 'settings:public'),
})
