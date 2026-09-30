export const useCheckout = () => {
  /**
   * Reserve stock for cart items during checkout
   * @param cartId - The cart UUID or ID
   * @returns Array of reservation IDs
   * @throws Error with structured data for insufficient stock
   */
  const reserveStock = async (cartId: string | number): Promise<number[]> => {
    try {
      const response = await $api('/api/cart/reserve-stock', {
        method: 'POST',
        body: { cartId },
      })
      return response?.reservationIds || []
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:reserveStock', error })

      throw parseInsufficientStockError(error) ?? error
    }
  }

  /**
   * Release stock reservations (e.g., when user abandons checkout)
   * @param reservationIds - Array of reservation IDs to release
   */
  const releaseReservations = async (reservationIds: number[]): Promise<void> => {
    try {
      await $api('/api/cart/release-reservations', {
        method: 'POST',
        body: { reservationIds },
      })
    }
    catch (error) {
      log.error({ action: 'checkout:releaseReservations', error })
      throw error
    }
  }

  /**
   * Create payment intent from cart before order creation (for online payments).
   *
   * The shipping fields are required because the backend uses them to
   * compute the PaymentIntent amount against the SAME per-carrier
   * free-shipping threshold the order-create step will verify against.
   * Without them, the server falls back to the generic threshold and
   * order-create fails with ``PaymentAmountMismatchError`` whenever
   * the thresholds diverge.
   */
  const createPaymentIntentFromCart = async (
    args: CartCreatePaymentIntentRequestRequest,
    idempotencyKey?: string,
  ): Promise<{ clientSecret: string, paymentIntentId: string }> => {
    try {
      const response = await $api<{
        clientSecret: string
        paymentIntentId: string
        amount: number
        currency: string
      }>('/api/cart/create-payment-intent', {
        method: 'POST',
        body: args,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      })
      return {
        clientSecret: response.clientSecret,
        paymentIntentId: response.paymentIntentId,
      }
    }
    catch (error) {
      log.error({ action: 'checkout:createPaymentIntent', error })
      throw error
    }
  }

  return {
    reserveStock,
    releaseReservations,
    createPaymentIntentFromCart,
  }
}
