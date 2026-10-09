import { useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()

  try {
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/category/all`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListAllProductCategoryResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductCategoryAll',
  maxAge: 60 * 60, // 1 hour cache - categories rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, 'product-categories-all'),
})
