import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogAuthorQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/author`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogAuthorResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'BlogAuthorViewSet',
  maxAge: 60 * 60, // 1 hour - authors change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `blog-authors:${queryCacheKey(event, zListBlogAuthorQuery)}`),
})
