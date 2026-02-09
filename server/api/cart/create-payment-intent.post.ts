/**
 * Create a Stripe payment intent from cart for online payment checkout.
 *
 * This endpoint creates a payment intent based on the cart total before order creation.
 * The payment_intent_id is then used when creating the order.
 *
 * Flow:
 * 1. Get cart from session/auth
 * 2. Calculate total amount from cart
 * 3. Create Stripe payment intent
 * 4. Return client_secret and payment_intent_id
 *
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)

  try {
    const body = await readValidatedBody(event, (data: any) => {
      if (!data.payWayId || typeof data.payWayId !== 'number') {
        throw new Error('payWayId is required and must be a number')
      }
      return { payWayId: data.payWayId }
    })

    // Get cart headers (includes cart UUID for guest users)
    const cartHeaders = await cartSession.getCartHeaders()

    // Call backend to create payment intent from cart
    const response = await $fetch<{
      clientSecret: string
      paymentIntentId: string
      amount: string
      currency: string
    }>(`${config.apiBaseUrl}/cart/create-payment-intent`, {
      method: 'POST',
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
      body: {
        payWayId: body.payWayId,
      },
    })

    return {
      clientSecret: response.clientSecret,
      paymentIntentId: response.paymentIntentId,
      amount: response.amount,
      currency: response.currency,
    }
  }
  catch (error) {
    await handleError(error)
  }
})
