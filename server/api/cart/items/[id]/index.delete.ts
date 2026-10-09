import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)

  try {
    const headers = await cartSession.getCartHeaders()
    const params = await parseRouterParams(
      event,
      zDestroyCartItemPath,
    )
    await useBackendFetch(event)(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'DELETE',
        headers,
      },
    )
    return { success: true }
  }
  catch (error) {
    handleError(event, error)
  }
})
