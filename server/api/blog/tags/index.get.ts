import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogTagQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/tag`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogTagResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'BlogTagViewSet',
  maxAge: 60 * 30, // 30 minutes - tags change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `blog-tags:${queryCacheKey(event, zListBlogTagQuery)}`),
})
