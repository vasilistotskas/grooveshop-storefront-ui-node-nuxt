export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveProductPath.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/product/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveProductResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => `product-detail:${getRouterParam(event, 'id')}`,
})
