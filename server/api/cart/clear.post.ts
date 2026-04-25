export default defineEventHandler(async (event) => {
  await requireAllAuthAccessToken(event)
  const cartSession = useCartSession(event)

  try {
    await cartSession.clearSession()
    return { success: true }
  }
  catch (error) {
    await handleError(error)
  }
})
