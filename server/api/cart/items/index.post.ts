import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)
  const wideLog = event.context.log

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, zCreateCartItemBody)
    wideLog?.set({ cart: { item: { productId: body.product, quantity: body.quantity } } })
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart/item`, {
      method: 'POST',
      headers,
      body,
    })
    const parsedData = await parseDataAs(response, zCreateCartItemResponse)

    if (parsedData.cartId) {
      await cartSession.updateSession({ cartId: parsedData.cartId })
    }

    return parsedData
  }
  catch (error) {
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
