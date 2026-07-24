export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductVariantsPath.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/product/${params.id}/variants`,
      {
        method: 'GET',
        headers: createHeaders(null, null),
      },
    )
    return await parseDataAs(response, zListProductVariantsResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ProductVariantsViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => `product-variants:${getRouterParam(event, 'id')}`,
})
