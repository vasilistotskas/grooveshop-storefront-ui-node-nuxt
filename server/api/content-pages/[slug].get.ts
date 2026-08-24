export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveContentPagePath.parse,
    )
    // useBackendFetch: ContentPage rows are per-tenant — a raw $fetch
    // carries no X-Forwarded-Host, Django would resolve the public
    // schema and every tenant would get a 404 (same reasoning as
    // page-config/[pageType].get.ts).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/content-page/${params.slug}`,
      { method: 'GET' },
    )
    return await parseDataAs(response, zRetrieveContentPageResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ContentPageDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60 * 2,
  swr: true,
  getKey: (event) => {
    const params = getRouterParams(event)
    return tenantCacheKey(event, `content-page:${params.slug}`)
  },
})
