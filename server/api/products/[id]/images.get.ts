import { getRouterParam, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(event, zListProductImagesPath)
    const query = await getValidatedQuery(event, zListProductImagesQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/${params.id}/images`, {
      method: 'GET',
      query,
      headers: createHeaders(event, null, null),
    })
    return await parseDataAs(response, zListProductImagesResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductImagesViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, `product-images:${getRouterParam(event, 'id', { decode: true })}:${JSON.stringify(getQuery(event))}`),
})
