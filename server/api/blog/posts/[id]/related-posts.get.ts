import { getRouterParams, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zListBlogPostRelatedPath,
    )
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/post/${params.id}/related_posts`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogPostRelatedResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogPostRelatedPosts',
  maxAge: 60 * 15, // 15 minutes - related posts can change when new posts are added
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `related-posts:${getRouterParams(event, { decode: true }).id}`),
})
