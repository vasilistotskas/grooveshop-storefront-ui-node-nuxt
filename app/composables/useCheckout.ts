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

  return {
    reserveStock,
    releaseReservations,
  }
}
