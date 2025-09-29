export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zCreateOrderPaymentIntentData.shape.path.parse,
    )
    const body = await readValidatedBody(event, zCreateOrderPaymentIntentData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}/create_payment_intent`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateOrderPaymentIntentResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
