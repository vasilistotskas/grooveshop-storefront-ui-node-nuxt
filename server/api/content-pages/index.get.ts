import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListContentPageQuery)
    // useBackendFetch: ContentPage rows are per-tenant — see
    // content-pages/[slug].get.ts for why a raw $fetch is unsafe here.
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/content-page`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListContentPageResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'ContentPageViewSet',
  maxAge: 60 * 10, // 10 minutes cache for better performance
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `content-pages:${queryCacheKey(event, zListContentPageQuery)}`),
})
