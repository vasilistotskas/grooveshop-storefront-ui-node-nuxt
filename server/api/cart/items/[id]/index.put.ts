export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, zUpdateCartItemBody.parse)
    const params = await getValidatedRouterParams(
      event,
      zUpdateCartItemPath.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'PUT',
        headers,
        body,
      },
    )
    const parsedData = await parseDataAs(response, zUpdateCartItemResponse)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
