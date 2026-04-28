export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Django's OrderViewSet.create has permission_classes=[] (public) so
  // guest checkout is allowed server-side. We don't gate the request
  // here with require* — guests reach Django via their cart_id session
  // cookie. useCartSession.getCartHeaders() already attaches the
  // Authorization Bearer token for logged-in shoppers.
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)

  try {
    wideLog.set({ order: { created: true } })
    const body = await readValidatedBody(event, zCreateOrderBody.parse)
    const cartHeaders = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/order`, {
      method: 'POST',
      body,
      headers: cartHeaders,
    })

    const parsedData = await parseDataAs(response, zCreateOrderResponse)

    return parsedData
  }
  catch (error) {
    await handleError(error)
  }
})
