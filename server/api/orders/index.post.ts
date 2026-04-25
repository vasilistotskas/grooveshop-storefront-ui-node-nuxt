export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
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
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const parsedData = await parseDataAs(response, zCreateOrderResponse)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
