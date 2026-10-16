import { useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * Adopt a cart the agent gateway built (`uuid`) into this browser's cart
 * session, the way the storefront keeps a guest cart it created itself,
 * and return it. Django answers for the shopper's session: a signed-in
 * shopper's account cart absorbs the guest cart (its guest→account
 * merge), a guest gets that cart.
 *
 * The session changes only once Django has answered with a cart, so an
 * unknown or expired uuid throws and leaves the shopper's own cart as it
 * was. Used by `/cart/claim` (the checkout link the assistant hands out)
 * and `/api/cart/claim` (the chat widget, when the browser had no cart).
 */
export async function claimCart(event: RequestEvent, uuid: string) {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)
  const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart`, {
    method: 'GET',
    headers: await cartSession.getCartHeaders(uuid),
  })
  const cart = await parseDataAs(response, zRetrieveCartResponse)
  await cartSession.handleCartResponse(cart)
  event.context.log?.set({ cart: { claimed: cart.uuid } })
  return cart
}
