import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Create a Stripe payment intent from cart for online payment checkout.
 *
 * Forwards the destination country (required — a ``ShippingRate`` is
 * per-country, so there is no priceable shipping option without one)
 * and the chosen shipping provider/kind, so the PaymentIntent amount is
 * computed against the SAME rate the order-create verification step
 * resolves. A mismatch here raises ``PaymentAmountMismatchError`` at
 * order-create time.
 */
const bodySchema = zCartCreatePaymentIntentRequestRequest

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)
  const wideLog = event.context.log

  try {
    wideLog?.set({ payment: { method: 'stripe' } })
    const body = await readValidatedBody(event, bodySchema)

    const cartHeaders = await cartSession.getCartHeaders()

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart/create-payment-intent`, {
      method: 'POST',
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
      body,
    })

    return await parseDataAs(response, zCreateCartPaymentIntentResponse)
  }
  catch (error) {
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
