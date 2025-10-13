export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)
  try {
    const sessionData = await cartSession.getSession()

    if (!sessionData.cartId) {
      return null
    }

    const headers = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    const parsedData = await parseDataAs(response, zRetrieveCartResponse)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
