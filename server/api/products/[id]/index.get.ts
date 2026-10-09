import { getRouterParam, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(event, zRetrieveProductPath)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/${params.id}`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    return await parseDataAs(response, zRetrieveProductResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, `product-detail:${getRouterParam(event, 'id', { decode: true })}`),
})
