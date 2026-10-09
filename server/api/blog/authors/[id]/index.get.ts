import { getRouterParams, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveBlogAuthorPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/blog/author/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogAuthorResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogAuthorDetail',
  maxAge: 60 * 60, // 1 hour - authors change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `blog-author:${getRouterParams(event, { decode: true }).id}`),
})
