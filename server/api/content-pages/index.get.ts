export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListContentPageQuery.parse)
    // useBackendFetch: ContentPage rows are per-tenant — see
    // content-pages/[slug].get.ts for why a raw $fetch is unsafe here.
    const response = await useBackendFetch()(`${config.apiBaseUrl}/content-page`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListContentPageResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ContentPageViewSet',
  maxAge: 60 * 10, // 10 minutes cache for better performance
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    // Create a stable cache key based on relevant query params
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
      query.paginationType || 'pageNumber',
      query.page || '1',
      query.ordering || '-publishedAt',
      query.cursor || '',
      query.search || '',
    ]
    return tenantCacheKey(event, `content-pages:${keyParts.join(':')}`)
  },
})
