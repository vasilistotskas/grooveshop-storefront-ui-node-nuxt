export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/product`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
