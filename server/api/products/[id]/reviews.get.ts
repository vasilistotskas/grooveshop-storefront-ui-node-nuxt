import { getRouterParam, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(event, zListProductReviewsPath)
    // Forwarded, not dropped: the product page's page/ordering choice
    // used to end here and every caller got page 1, newest first.
    const query = await getValidatedQuery(event, zListProductReviewsQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/${params.id}/reviews`, {
      method: 'GET',
      query,
      headers: createHeaders(event, null, null),
    })
    return await parseDataAs(response, zListProductReviewsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductReviewsViewSet',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  // The query is part of the key: two sorts or two pages of the same
  // product are different responses.
  getKey: event => tenantCacheKey(
    event,
    `product-reviews:${getRouterParam(event, 'id', { decode: true })}:${JSON.stringify(getQuery(event))}`,
  ),
})
