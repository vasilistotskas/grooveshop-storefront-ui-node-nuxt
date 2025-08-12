export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession()

  try {
    const headers = await cartSession.getCartHeaders()
    const params = await getValidatedRouterParams(
      event,
      zDestroyCartItemData.shape.path.parse,
    )
    await $fetch(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'include',
      },
    )
    return { success: true }
  }
  catch (error) {
    await handleError(error)
  }
})
