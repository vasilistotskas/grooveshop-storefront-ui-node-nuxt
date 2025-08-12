export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveProductData.shape.path.parse)
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
})
