/**
 * Fetch per-tenant extra_settings rows.
 *
 * Uses `useBackendFetch` so Django sees `X-Forwarded-Host` and resolves
 * the request to the right tenant schema — without it the raw `$fetch`
 * sends only the internal K8s service hostname and Django falls back to
 * the public schema, so every tenant gets the platform defaults
 * (N1 in MULTI_TENANT_AUDIT.md).
 *
 * The cache key is already tenant-scoped via `tenantCacheKey`; this fix
 * makes the upstream fetch itself tenant-aware too.
 */
export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/settings`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zApiV1SettingsListResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'SettingsViewSet',
  maxAge: 60 * 60, // 1 hour - settings rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, 'settings'),
})
