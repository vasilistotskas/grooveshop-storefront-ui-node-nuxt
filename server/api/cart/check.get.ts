export default defineEventHandler(async (event) => {
  const cartSession = useCartSession(event)

  try {
    const sessionData = await cartSession.getSession()
    return !!sessionData.cartId
  }
  catch (error) {
    await handleError(error)
    return false
  }
})
