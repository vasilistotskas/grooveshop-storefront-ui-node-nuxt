/**
 * Empty the visitor's cart ("Empty cart" on the cart page).
 *
 * Django deletes the cart itself (`DELETE /cart`, 204), so the cart
 * session forgets its id afterwards: the next cart request starts a fresh
 * cart instead of addressing one that no longer exists. A visitor with
 * neither a cart nor an account has nothing to empty.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)

  try {
    const { cartId } = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)
    if (!cartId && !accessToken) return null

    await $fetch(`${config.apiBaseUrl}/cart`, {
      method: 'DELETE',
      headers: await cartSession.getCartHeaders(),
    })
    await cartSession.clearSession()
    return null
  }
  catch (error) {
    return forwardUpstreamClientError(error)
  }
})
