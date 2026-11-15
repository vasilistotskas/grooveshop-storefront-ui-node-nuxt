import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCommentQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/comment`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCommentResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'BlogCommentViewSet',
  maxAge: 60 * 5, // 5 minutes - comments can change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `blog-comments:${queryCacheKey(event, zListBlogCommentQuery)}`),
})
