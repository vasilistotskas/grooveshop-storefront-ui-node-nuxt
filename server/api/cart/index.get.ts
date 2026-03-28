export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)
  try {
    const sessionData = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)

    // Need either a guest cartId or an authenticated user to fetch the cart
    if (!sessionData.cartId && !accessToken) {
      return null
    }
    if (sessionData.cartId) {
      wideLog.set({ cart: { id: sessionData.cartId } })
    }

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
