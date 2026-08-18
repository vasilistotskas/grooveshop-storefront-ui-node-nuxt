export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const pageType = getRouterParam(event, 'pageType')

  try {
    // useBackendFetch: page_config rows are PER-TENANT tables — a raw
    // $fetch carries no X-Forwarded-Host, Django resolves the public
    // schema and every tenant would get 404/fallback (N1 pattern in
    // MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/page-config/${pageType}`,
      { method: 'GET' },
    )
    return await parseDataAs(response, zPageLayout)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'pageConfig',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: (event) => {
    const pageType = getRouterParam(event, 'pageType')
    return tenantCacheKey(event, `page-config:${pageType}`)
  },
})
