export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zUpdateOrderData.shape.path.parse,
    )
    const body = await readValidatedBody(event, zUpdateOrderData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}`, {
      method: 'PUT',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zUpdateOrderResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
