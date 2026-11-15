import { getRouterParams, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zListBlogPostCommentsPath,
    )
    const query = await getValidatedQuery(event, zListBlogPostCommentsQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/post/${params.id}/comments`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogPostCommentsResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'BlogPostComments',
  maxAge: 60 * 5, // 5 minutes - comments can change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
  getKey: event => tenantCacheKey(
    event,
    `post-comments:${getRouterParams(event, { decode: true }).id}:${queryCacheKey(event, zListBlogPostCommentsQuery)}`,
  ),
})
