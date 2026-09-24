export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // The page's locale, clamped to the tenant's by
  // server/middleware/1.locale.ts (from the X-Language the app states).
  // Sent to Django as `?locale=`, which page_config reads to pick the
  // menu's language (page_config/localization.py).
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
