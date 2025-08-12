export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveProductImageData.shape.path.parse)
    const query = await getValidatedQuery(event, zRetrieveProductImageData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/image/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zRetrieveProductImageResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'ProductImageViewSet' })
