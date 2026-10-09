import { getRouterParams, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveBlogCategoryPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogCategoryResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogCategoryDetail',
  maxAge: 60 * 30, // 30 minutes - categories change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `blog-category:${getRouterParams(event, { decode: true }).id}`),
})
