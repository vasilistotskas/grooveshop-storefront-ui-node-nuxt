export default defineEventHandler(async (event) => {
  const cartSession = useCartSession(event)

  try {
    // Clear the entire cart session
    await cartSession.clearSession()

    return { success: true }
  }
  catch (error) {
    await handleError(error)
  }
})
