export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveOrderData.shape.path.parse,
    )
    const url = `${config.apiBaseUrl}/order/${params.id}`
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zRetrieveOrderResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
