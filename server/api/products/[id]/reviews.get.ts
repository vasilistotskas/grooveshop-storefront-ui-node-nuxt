export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductReviewsPath.parse)
    // Forwarded, not dropped: the product page's page/ordering choice
    // used to end here and every caller got page 1, newest first.
    const query = await getValidatedQuery(event, zListProductReviewsQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/${params.id}/reviews`, {
      method: 'GET',
      query,
      headers: createHeaders(null, null),
    })
    return await parseDataAs(response, zListProductReviewsResponse)
  }
  catch (error) {
    handleError(error)
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
    `product-reviews:${getRouterParam(event, 'id')}:${JSON.stringify(getQuery(event))}`,
  ),
})
