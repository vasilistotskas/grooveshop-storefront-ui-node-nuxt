export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, zCreateCartItemData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/cart/item`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body,
    })
    const parsedData = await parseDataAs(response, zCreateCartItemResponse)

    if (parsedData.cartId) {
      await cartSession.updateSession({ cartId: parsedData.cartId })
    }

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
