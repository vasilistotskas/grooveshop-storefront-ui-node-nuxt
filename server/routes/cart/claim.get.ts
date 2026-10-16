import * as z from 'zod'
import { defineEventHandler, getValidatedQuery, sendRedirect } from 'nuxt/server'

// Agent-built carts (grooveshop-agent-gateway) hand the shopper a link of
// the form `/cart/claim?uuid=<cart-uuid>` once they're ready to check out.
// This route adopts that guest cart into the browser session (`claimCart`)
// then sends the shopper to the cart page to finish checkout normally.
//
// Any failure (malformed uuid, unknown/expired cart) redirects to /cart
// WITHOUT touching the existing session, so a bad or replayed claim link
// can never clobber a shopper's real cart.
const zCartClaimQuery = z.object({
  uuid: z.uuid(),
})

export default defineEventHandler(async (event) => {
  try {
    const { uuid } = await getValidatedQuery(event, zCartClaimQuery)
    await claimCart(event, uuid)
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
