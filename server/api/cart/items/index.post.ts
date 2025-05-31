export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession()

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, ZodCartItemCreateBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/cart/item`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body,
    })
    const parsedData = await parseDataAs(response, ZodCartItemCreateResponse)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
