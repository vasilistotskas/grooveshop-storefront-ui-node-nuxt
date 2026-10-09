import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'

// Agent-built carts (grooveshop-agent-gateway) hand the shopper a link of
// the form `/cart/claim?uuid=<cart-uuid>` once they're ready to check out.
// This route adopts that guest cart into the browser session — mirroring
// what happens when the storefront itself creates a guest cart — then
// sends the shopper to the cart page to finish checkout normally.
//
// Any failure (malformed uuid, unknown/expired cart) redirects to /cart
// WITHOUT touching the existing session, so a bad or replayed claim link
// can never clobber a shopper's real cart.
const zCartClaimQuery = z.object({
  uuid: z.uuid(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)
  const wideLog = event.context.log

  try {
    const { uuid } = await getValidatedQuery(event, zCartClaimQuery)

    const headers = await cartSession.getCartHeaders(uuid)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart`, {
      method: 'GET',
      headers,
    })
    const parsedData = await parseDataAs(response, zRetrieveCartResponse)

    await cartSession.handleCartResponse(parsedData)
    wideLog?.set({ cart: { claimed: parsedData.uuid } })

    return sendRedirect(event, '/cart')
  }
  catch (error) {
    log.warn({
      tag: 'cartClaim',
      message: 'cart claim failed, redirecting without session change',
      error: error instanceof Error ? error.message : String(error),
    })
    return sendRedirect(event, '/cart')
  }
})
