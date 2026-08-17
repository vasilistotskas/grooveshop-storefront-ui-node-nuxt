export default defineEventHandler(async (event) => {
  // No auth requirement — both authenticated users and guests have a
  // cart session cookie that needs clearing (after order creation and
  // on logout). An access-token requirement here once broke guest
  // checkout success flows with a 401, leaving the stale cart session
  // pointing at a now-paid cart. The session cookie itself is the only
  // thing this clears; nothing here exposes user data.
  const cartSession = useCartSession(event)

  try {
    await cartSession.clearSession()
    return { success: true }
  }
  catch (error) {
    handleError(error)
  }
})
