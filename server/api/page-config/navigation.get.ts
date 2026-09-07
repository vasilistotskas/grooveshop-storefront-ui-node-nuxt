export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Already clamped to the tenant's locales by server/middleware/1.locale.ts,
  // which reads this route's own ?locale= as its first priority.
  const locale = requestLocale(event)

  try {
    // useBackendFetch: NavigationMenu rows are per-tenant tables — the
    // fetch must carry X-Forwarded-Host or Django serves the public
    // schema (N1 pattern in MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/page-config/navigation`,
      { method: 'GET', query: { locale } },
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
  // Menu labels are per-locale, so the locale is part of the key —
  // without it the first language to warm the cache owns the header for
  // every other one.
  getKey: event => tenantCacheKey(
    event,
    `page-config:navigation:${requestLocale(event)}`,
  ),
})
