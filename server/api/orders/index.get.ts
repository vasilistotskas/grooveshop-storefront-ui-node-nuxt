export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListOrderData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/order`, query)
    const response = await $fetch(url, {
      method: 'GET',
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
