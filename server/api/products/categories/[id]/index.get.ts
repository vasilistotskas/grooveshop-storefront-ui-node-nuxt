import { getRouterParams, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveProductCategoryPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/category/${params.id}`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    return await parseDataAs(response, zRetrieveProductCategoryResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductCategoryDetail',
  maxAge: 60 * 60, // 1 hour - categories change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, `product-category:${getRouterParams(event, { decode: true }).id}`),
})
