import { FetchError } from 'ofetch'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)
  try {
    const sessionData = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)

    // Need either a guest cartId or an authenticated user to fetch the cart
    if (!sessionData.cartId && !accessToken) {
      return null
    }
    if (sessionData.cartId) {
      wideLog.set({ cart: { id: sessionData.cartId } })
    }

    const headers = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart`, {
      method: 'GET',
      headers,
    })

    const parsedData = await parseDataAs(response, zRetrieveCartResponse)

    await cartSession.handleCartResponse(parsedData)

    return parsedData
  }
  catch (error) {
    // If the auth token is expired/invalid (401/403), the user's session
    // was likely cleared by the allauth routes during the same SSR pass.
    // Return null (no cart) instead of throwing — the browser will get the
    // session-clearing cookie and subsequent requests will work cleanly.
    if (error instanceof FetchError && (error.statusCode === 401 || error.statusCode === 403)) {
      log.info('cart', `Auth expired (${error.statusCode}), returning empty cart`)
      return null
    }
    await handleError(error)
  }
})
