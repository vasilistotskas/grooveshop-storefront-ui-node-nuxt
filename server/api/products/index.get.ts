export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
