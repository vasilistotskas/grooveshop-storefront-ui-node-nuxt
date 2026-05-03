export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductReviewsPath.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/${params.id}/reviews`, {
      method: 'GET',
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
  getKey: event => `product-reviews:${getRouterParam(event, 'id')}`,
})
