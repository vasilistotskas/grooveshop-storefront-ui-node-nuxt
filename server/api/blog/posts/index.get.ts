import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogPostQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/post`, {
      method: 'GET',
      query,
    })
    // A list is CARDS (title, subtitle, image, counts): the schema of a
    // list post has no body, so parsing drops it and the payload stays small.
    return await parseDataAs(response, zListBlogPostResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'BlogPostViewSet',
  maxAge: 60 * 10, // 10 minutes cache for better performance
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `blog-posts:${queryCacheKey(event, zListBlogPostQuery)}`),
})
