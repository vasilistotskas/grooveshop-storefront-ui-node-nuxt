export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductImageData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/image`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductImageResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'ProductImageViewSet' })
