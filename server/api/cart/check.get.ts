export default defineEventHandler(async (event) => {
  const cartSession = useCartSession(event)

  try {
    const sessionData = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)

    // Authenticated users may have a cart in Django even without a cartId in session
    return !!sessionData.cartId || !!accessToken
  }
  catch (error) {
    await handleError(error)
  }
})
