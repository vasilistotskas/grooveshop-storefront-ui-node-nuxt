export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const query = await getValidatedQuery(event, zListOrderItemQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order-items`, {
      method: 'GET',
      query,
      headers: createHeaders(null, accessToken),
    })
    return await parseDataAs(response, zListOrderItemResponse)
  }
  catch (error) {
    handleError(error)
  }
})
