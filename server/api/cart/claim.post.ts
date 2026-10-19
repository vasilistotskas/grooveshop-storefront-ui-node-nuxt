import * as z from 'zod'
import { defineEventHandler, readValidatedBody } from 'nuxt/server'

const zCartClaimBody = z.object({
  uuid: z.uuid(),
})

/**
 * The chat widget's way to adopt the cart the shopping assistant created
 * for a browser that had none (`claimCart`): the assistant's `done` event
 * names it, and without this the shopper's cart stayed empty while the
 * assistant reported the add (gateway#24).
 */
export default defineEventHandler(async (event) => {
  try {
    const { uuid } = await readValidatedBody(event, zCartClaimBody)
    return await claimCart(event, uuid)
  }
  catch (error) {
    return handleError(event, error)
  }
})
