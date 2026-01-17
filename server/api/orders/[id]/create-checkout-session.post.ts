export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zCreateOrderCheckoutSessionData.shape.path.parse,
    )
    const body = await readValidatedBody(event, zCreateOrderCheckoutSessionData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}/create_checkout_session`, {
      method: 'POST',
      body,
      ...(accessToken && {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    })
    return await parseDataAs(response, zCreateOrderCheckoutSessionResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
