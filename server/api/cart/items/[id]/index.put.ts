export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession()

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, zUpdateCartItemData.shape.body.parse)
    const params = await getValidatedRouterParams(
      event,
      zUpdateCartItemData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'PUT',
        headers,
        credentials: 'include',
        body,
      },
    )
    const parsedData = await parseDataAs(response, zUpdateCartItemResponse)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
