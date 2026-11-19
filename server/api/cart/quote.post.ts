import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * What checkout charges for the session cart with the shopper's choices
 * so far: Django's `POST /api/v1/cart/quote`, the computation order
 * creation and the payment intent run too (`docs/order/creation.md`
 * §3.0 in the Django repo). Its `expectedTotal` goes back with the order,
 * which Django then creates only at that total.
 *
 * The cart is named as order creation names it (`getCartHeaders`: the
 * guest cart's `X-Cart-Id` and the shopper's access token), never by an
 * `X-Cart-Token`: a token's quote is the cart owner's price, and the
 * order it would feed carries no token. Django's refusals (`{detail,
 * reason, code}`: a delivery it cannot price, a pay way not offered, a
 * loyalty or gift-card refusal) come back with their 4xx.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)

  try {
    // Every choice is optional, the body itself too (Django's contract):
    // an empty request quotes the cart alone.
    const body = await readValidatedBody(event, zQuoteCartBody.optional())
    const cartHeaders = await cartSession.getCartHeaders()

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart/quote`, {
      method: 'POST',
      headers: cartHeaders,
      body,
    })

    return await parseDataAs(response, zQuoteCartResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
