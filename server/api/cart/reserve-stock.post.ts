/**
 * Reserve stock for cart items during checkout.
 *
 * This endpoint creates temporary stock reservations (15-minute TTL) for all items
 * in the cart. Reservations prevent other customers from purchasing the same items
 * while the current customer completes payment.
 *
 * Flow:
 * 1. Get cart from session/auth
 * 2. Call backend /cart/reserve-stock/ endpoint
 * 3. Return reservation IDs to frontend
 *
 * References:
 * - Requirement 2.1 (Stock Reservation System)
 * - Task 8.2 (Add reserve_stock endpoint to CartViewSet)
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)

  try {
    // Get cart headers (includes cart UUID for guest users)
    const cartHeaders = await cartSession.getCartHeaders()

    // Call backend reserve-stock endpoint
    const response = await $fetch(`${config.apiBaseUrl}/cart/reserve-stock`, {
      method: 'POST',
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return await parseDataAs(response, zReserveCartStockResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
