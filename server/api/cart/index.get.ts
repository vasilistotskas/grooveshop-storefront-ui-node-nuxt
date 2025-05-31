export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession()
  try {
    const headers = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    const parsedData = await parseDataAs(response, ZodCart)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
