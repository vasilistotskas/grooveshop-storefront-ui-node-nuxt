export default defineEventHandler(async (event) => {
  // No auth requirement — both authenticated users and guests have a
  // cart session cookie that needs clearing after order creation.
  // Previously this route required an access token, so guest checkout
  // success flows hit a 401 and the stale cart session lingered
  // (still pointing at a now-paid cart). The session cookie itself is
  // the only thing this clears; nothing here exposes user data.
  const cartSession = useCartSession(event)

  try {
    await cartSession.clearSession()
    return { success: true }
  }
  catch (error) {
    handleError(error)
  }
})
