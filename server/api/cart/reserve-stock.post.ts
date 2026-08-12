import { FetchError } from 'ofetch'

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
  const wideLog = useLogger(event)

  try {
    wideLog.set({ cart: { reservation: true } })
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
    // Surface structured stock failure data where the client reads it
    // (``error.data.data`` in useCheckout.reserveStock). A thrown
    // ``createError({data})`` loses its payload in production — Nitro
    // strips ``data`` from thrown-error responses (same incident class
    // as the allauth flows) — which silently disabled the per-item
    // stock-error UI in prod. RETURN the wrapper with the 409 status
    // instead (returned bodies are not stripped), mirroring
    // forwardAllAuthFlow's shape contract.
    if (error instanceof FetchError && error.statusCode === 409) {
      const errorData = error.data as Record<string, unknown> | undefined
      log.warn({
        action: 'checkout:reserveStock:insufficientStock',
        detail: errorData?.detail,
      })
      setResponseStatus(event, 409)
      return {
        statusCode: 409,
        statusMessage: 'Insufficient stock',
        data: {
          code: 'insufficient_stock',
          detail: errorData?.detail,
          failedItems: errorData?.failed_items ?? errorData?.failedItems,
        },
      } as unknown as undefined
    }
    // Non-409 upstream 4xx (bad cart, expired session): forward the
    // body so getErrorDetail can surface Django's reason.
    return forwardUpstreamClientError(error)
  }
})
