/**
 * Create a Stripe payment intent from cart for online payment checkout.
 *
 * Forwards the chosen shipping provider/kind so the PaymentIntent
 * amount is computed against the SAME per-carrier free-shipping
 * threshold the order-create verification step uses. Without these
 * fields, the backend silently falls back to the generic
 * ``FREE_SHIPPING_THRESHOLD`` / ``CHECKOUT_SHIPPING_PRICE`` pair —
 * disagreeing with the carrier adapters whenever the thresholds
 * differ and raising ``PaymentAmountMismatchError`` at order-create
 * time.
 */
const bodySchema = zCartCreatePaymentIntentRequestRequest

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)

  try {
    wideLog.set({ payment: { method: 'stripe' } })
    const body = await readValidatedBody(event, bodySchema.parse)

    const cartHeaders = await cartSession.getCartHeaders()

    const response = await $fetch(`${config.apiBaseUrl}/cart/create-payment-intent`, {
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
    handleError(error)
  }
})
