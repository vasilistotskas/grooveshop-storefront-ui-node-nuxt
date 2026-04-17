export const useCheckout = () => {
  /**
   * Reserve stock for cart items during checkout
   * @param cartId - The cart UUID or ID
   * @returns Array of reservation IDs
   * @throws Error with structured data for insufficient stock
   */
  const reserveStock = async (cartId: string | number): Promise<number[]> => {
    try {
      const response = await $fetch('/api/cart/reserve-stock', {
        method: 'POST',
        body: { cartId },
      })
      return response?.reservationIds || []
    }
    catch (error: any) {
      log.error({ action: 'checkout:reserveStock', error })

      // Extract structured error data for insufficient stock
      // Server route normalizes 409 errors with {code, detail, failedItems} at error.data.data
      const errorData = error?.data?.data
      if (errorData?.code === 'insufficient_stock' && errorData?.failedItems) {
        const structuredError = new Error('Insufficient stock for one or more items')
        Object.assign(structuredError, {
          code: errorData.code,
          failedItems: errorData.failedItems,
          detail: errorData.detail,
        })
        throw structuredError
      }

      throw error
    }
  }

  /**
   * Release stock reservations (e.g., when user abandons checkout)
   * @param reservationIds - Array of reservation IDs to release
   */
  const releaseReservations = async (reservationIds: number[]): Promise<void> => {
    try {
      await $fetch('/api/cart/release-reservations', {
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
   * Create payment intent from cart before order creation (for online payments)
   * @param cartId - The cart UUID or ID
   * @param payWayId - The payment method ID
   * @returns Payment intent details including client_secret and payment_intent_id
   */
  const createPaymentIntentFromCart = async (
    cartId: string | number,
    payWayId: number,
  ): Promise<{ clientSecret: string, paymentIntentId: string }> => {
    try {
      const response = await $fetch<{
        clientSecret: string
        paymentIntentId: string
        amount: string
        currency: string
      }>('/api/cart/create-payment-intent', {
        method: 'POST',
        body: { cartId, payWayId },
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

  /**
   * Get payment status for an order
   * @param orderId - The order ID
   * @param orderUuid - Optional UUID for guest order access
   * @returns Payment status information
   */
  const getPaymentStatus = async (orderId: string | number, orderUuid?: string): Promise<any> => {
    try {
      const response = await $fetch(`/api/orders/${orderId}/payment-status`, {
        method: 'GET',
        query: orderUuid ? { uuid: orderUuid } : undefined,
      })
      return response
    }
    catch (error) {
      log.error({ action: 'checkout:getPaymentStatus', error })
      throw error
    }
  }

  /**
   * Poll payment status until it reaches a final state
   * @param orderId - The order ID
   * @param maxAttempts - Maximum number of polling attempts
   * @param interval - Interval between attempts in milliseconds
   * @param orderUuid - Optional UUID for guest order access
   * @returns Final payment status
   */
  const pollPaymentStatus = async (
    orderId: string | number,
    maxAttempts = 10,
    interval = 2000,
    orderUuid?: string,
  ): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await getPaymentStatus(orderId, orderUuid)

      // Check if payment reached a final state
      if (['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED'].includes(status.status)) {
        return status
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Payment status polling timeout')
  }

  /**
   * Retry payment for a failed/pending order. Creates a fresh Stripe
   * PaymentIntent on the existing order so the customer can re-enter
   * card details without starting a new order.
   * @param orderId - The order ID
   * @param orderUuid - Optional UUID for guest order access
   * @returns Payment intent details including client_secret and payment_intent_id
   */
  const retryPayment = async (
    orderId: string | number,
    orderUuid?: string,
  ): Promise<{ clientSecret: string, paymentIntentId: string }> => {
    try {
      const response = await $fetch<{
        clientSecret?: string
        paymentIntentId?: string
      }>(`/api/orders/${orderId}/retry-payment`, {
        method: 'POST',
        body: {},
        query: orderUuid ? { uuid: orderUuid } : undefined,
      })
      // Django's retry-payment endpoint always returns a clientSecret
      // for the fresh Stripe PaymentIntent. An empty value would
      // silently break the Stripe Elements remount on the caller side,
      // so we fail loudly here instead.
      if (!response.clientSecret) {
        throw new Error('retryPayment: missing clientSecret in response')
      }
      return {
        clientSecret: response.clientSecret,
        paymentIntentId: response.paymentIntentId || '',
      }
    }
    catch (error) {
      log.error({ action: 'checkout:retryPayment', error })
      throw error
    }
  }

  return {
    reserveStock,
    releaseReservations,
    createPaymentIntentFromCart,
    getPaymentStatus,
    pollPaymentStatus,
    retryPayment,
  }
}
