export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)

  try {
    const headers = await cartSession.getCartHeaders()
    const params = await getValidatedRouterParams(
      event,
      zDestroyCartItemPath.parse,
    )
    await $fetch(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'DELETE',
        headers,
      },
    )
    return { success: true }
  }
  catch (error) {
    await handleError(error)
  }
})
