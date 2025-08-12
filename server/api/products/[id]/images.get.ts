export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductImagesData.shape.path.parse)
    const query = await getValidatedQuery(event, zListProductImagesData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/${params.id}/images`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductImagesResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
