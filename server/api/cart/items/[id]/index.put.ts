export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession()

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, ZodCartItemPutBody.parse)
    const params = await getValidatedRouterParams(event, ZodCartItemParams.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'PUT',
        headers,
        credentials: 'include',
        body,
      },
    )
    const parsedData = await parseDataAs(response, ZodCartItem)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
