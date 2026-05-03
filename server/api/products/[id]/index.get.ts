export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveProductPath.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/product/${params.id}`,
      {
        method: 'GET',
        headers: createHeaders(null, null),
      },
    )
    return await parseDataAs(response, zRetrieveProductResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ProductDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => `product-detail:${getRouterParam(event, 'id')}`,
})
