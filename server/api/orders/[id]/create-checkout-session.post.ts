export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zCreateOrderCheckoutSessionPath.parse,
    )
    const body = await readValidatedBody(event, zCreateOrderCheckoutSessionBody.parse)
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
