export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListOrderData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListOrderResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
