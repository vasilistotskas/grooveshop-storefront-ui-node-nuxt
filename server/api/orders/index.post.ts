export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)

  try {
    wideLog.set({ order: { created: true } })
    const body = await readValidatedBody(event, zCreateOrderBody.parse)
    const cartHeaders = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/order`, {
      method: 'POST',
      body,
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    const parsedData = await parseDataAs(response, zCreateOrderResponse)

    // Clear the entire cart session after successful order creation
    await cartSession.clearSession()

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
