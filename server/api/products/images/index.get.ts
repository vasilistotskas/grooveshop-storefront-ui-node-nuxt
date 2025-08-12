export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductImageData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/product/image`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductImageResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'ProductImageViewSet' })
