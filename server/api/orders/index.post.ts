export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateOrderData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateOrderResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
