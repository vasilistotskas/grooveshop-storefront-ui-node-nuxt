export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListMyOrdersData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/my_orders`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListMyOrdersResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
