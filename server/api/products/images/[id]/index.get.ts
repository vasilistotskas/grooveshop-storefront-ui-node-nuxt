export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveProductImageData.shape.path.parse)
    const query = await getValidatedQuery(event, zRetrieveProductImageData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/image/${params.id}`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zRetrieveProductImageResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'ProductImageViewSet' })
