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

    return parsedData
  }
  catch (error) {
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
