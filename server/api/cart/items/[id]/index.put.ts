import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, zUpdateCartItemBody)
    const params = await parseRouterParams(
      event,
      zUpdateCartItemPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'PUT',
        headers,
        body,
      },
    )
    const parsedData = await parseDataAs(response, zUpdateCartItemResponse)

    // The cart the change left behind (see `items/index.post.ts`).
    return parsedData.cart
  }
  catch (error) {
    return handleError(event, error)
  }
})
