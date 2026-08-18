export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()

  try {
    // useBackendFetch: NavigationMenu rows are per-tenant tables — the
    // fetch must carry X-Forwarded-Host or Django serves the public
    // schema (N1 pattern in MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/page-config/navigation`,
      { method: 'GET' },
    )
    return await parseDataAs(
      response,
      zApiV1PageConfigNavigationRetrieveResponse,
    )
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'pageConfigNavigation',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, 'page-config:navigation'),
})
