export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListOrderItemQuery.parse)
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
