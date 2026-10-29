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
    return handleError(event, error)
  }
}, {
  name: 'BlogPostRelatedPosts',
  // Django's `blog` surface purges this handler on a post, category, author or tag
  // write (`core/cache/surfaces.py`), so the TTL only bounds a missed purge.
  maxAge: 60 * 60 * 6,
  staleMaxAge: 60 * 60 * 24,
  swr: true,
  getKey: event => tenantCacheKey(event, `related-posts:${getRouterParams(event, { decode: true }).id}`),
})
