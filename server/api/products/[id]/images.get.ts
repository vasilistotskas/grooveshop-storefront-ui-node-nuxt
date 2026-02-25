export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductImagesData.shape.path.parse)
    const query = await getValidatedQuery(event, zListProductImagesData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/${params.id}/images`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductImagesResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductImagesViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => `product-images:${getRouterParam(event, 'id')}:${JSON.stringify(getQuery(event))}`,
})
