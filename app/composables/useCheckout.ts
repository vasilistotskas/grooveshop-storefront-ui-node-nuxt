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
      console.error('Failed to reserve stock:', error)

      // Extract structured error data for insufficient stock
      const errorData = error?.data?.data || error?.data
      if (errorData?.failedItems) {
        // Re-throw with structured error for UI handling
        const structuredError = new Error('Insufficient stock for one or more items')
        Object.assign(structuredError, {
          code: 'insufficient_stock',
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
      console.error('Failed to release reservations:', error)
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
      console.error('Failed to create payment intent from cart:', error)
      throw error
    }
  }

  /**
   * Get payment status for an order
   * @param orderId - The order ID
   * @returns Payment status information
   */
  const getPaymentStatus = async (orderId: string | number): Promise<any> => {
    try {
      const response = await $fetch(`/api/orders/${orderId}/payment-status`, {
        method: 'GET',
      })
      return response
    }
    catch (error) {
      console.error('Failed to get payment status:', error)
      throw error
    }
  }

  /**
   * Poll payment status until it reaches a final state
   * @param orderId - The order ID
   * @param maxAttempts - Maximum number of polling attempts
   * @param interval - Interval between attempts in milliseconds
   * @returns Final payment status
   */
  const pollPaymentStatus = async (
    orderId: string | number,
    maxAttempts = 10,
    interval = 2000,
  ): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await getPaymentStatus(orderId)

      // Check if payment reached a final state
      if (['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED'].includes(status.status)) {
        return status
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Payment status polling timeout')
  }

  return {
    reserveStock,
    releaseReservations,
    createPaymentIntentFromCart,
    getPaymentStatus,
    pollPaymentStatus,
  }
}
