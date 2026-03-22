export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)
  try {
    const sessionData = await cartSession.getSession()

    if (!sessionData.cartId) {
      return null
    }
    wideLog.set({ cart: { id: sessionData.cartId } })

    const headers = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart`, {
      method: 'GET',
      headers,
    })

    const parsedData = await parseDataAs(response, zRetrieveCartResponse)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
