/**
 * Release stock reservations when customer abandons checkout.
 *
 * This endpoint releases previously created stock reservations, making the
 * reserved quantities available for other customers to purchase.
 *
 * Called when:
 * - Customer navigates away from checkout
 * - Payment fails
 * - Customer explicitly cancels
 *
 * References:
 * - Requirement 2.5 (Stock Reservation System - release on abandonment)
 * - Task 8.3 (Add release_reservations endpoint to CartViewSet)
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  const cartSession = useCartSession(event)

  try {
    const body = await readBody(event)
    const cartHeaders = await cartSession.getCartHeaders()

    // Call backend release-reservations endpoint
    const response = await $fetch(`${config.apiBaseUrl}/cart/release-reservations`, {
      method: 'POST',
      body,
      headers: {
        ...cartHeaders,
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return await parseDataAs(response, zReleaseCartReservationsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
