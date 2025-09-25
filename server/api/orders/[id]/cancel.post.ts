export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zCancelOrderData.shape.path.parse,
    )
    const body = await readValidatedBody(event, zCancelOrderData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}/cancel`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCancelOrderResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
