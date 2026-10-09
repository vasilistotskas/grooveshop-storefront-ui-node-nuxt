import { getRouterParams, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

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
    handleError(event, error)
  }
}, {
  name: 'BlogPostComments',
  maxAge: 60 * 5, // 5 minutes - comments can change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      getRouterParams(event, { decode: true }).id || '',
      query.pageSize || '10',
      query.paginationType || 'cursor',
      query.cursor || '',
      query.languageCode || 'el',
    ]
    return tenantCacheKey(event, `post-comments:${keyParts.join(':')}`)
  },
})
