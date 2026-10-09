import { getRouterParam, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(event, zListProductVariantsPath)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/${params.id}/variants`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    return await parseDataAs(response, zListProductVariantsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductVariantsViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, `product-variants:${getRouterParam(event, 'id', { decode: true })}`),
})
