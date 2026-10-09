import { getRouterParam, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(
      event,
      zGetBlogAuthorPostsQuery,
    )
    const params = await parseRouterParams(
      event,
      zGetBlogAuthorPostsPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/blog/author/${params.id}/posts`,
      {
        method: 'GET',
        query,
      },
    )
    return await parseDataAs(response, zGetBlogAuthorPostsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogAuthorPostsViewSet',
  // Mirrors the category-posts route: a new post appears within ten
  // minutes and the stale window absorbs the load. The author DETAIL
  // route caches for an hour because an author's bio changes far less
  // often than their post list.
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(
    event,
    `blog-author-posts:${getRouterParam(event, 'id', { decode: true })}:${JSON.stringify(getQuery(event))}`,
  ),
})
