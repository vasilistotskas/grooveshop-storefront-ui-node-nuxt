export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListOrderItemData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order-items`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListOrderItemResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
