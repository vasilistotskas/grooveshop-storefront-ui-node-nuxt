import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

// The query parameters the route accepts and forwards, in the schema's own
// order: the key does not depend on the order a caller wrote them in.
const QUERY_PARAMS = Object.keys(zListBlogPostQuery.shape)

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
  getKey: (event) => {
    const query = getQuery(event)
    // Every parameter Django filters, orders or pages on is a dimension of
    // the answer, so every one is part of the key: two lists that differ
    // only by `search`, `featured`, `category`, `tags` or `author` used to
    // share one entry. Read off the validated schema, so a filter Django
    // adds to the endpoint is keyed the day the schema is regenerated.
    const parts = QUERY_PARAMS.flatMap((name) => {
      const value = query[name]
      return value === undefined
        ? []
        : [`${name}=${[value].flat().map(item => encodeURIComponent(String(item))).join(',')}`]
    })
    return tenantCacheKey(event, `blog-posts:${parts.join('&')}`)
  },
})
