import { FetchError } from 'ofetch'
import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

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
  const wideLog = event.context.log

  try {
    wideLog?.set({ cart: { reservation: true } })
    // Get cart headers (includes cart UUID for guest users)
    const cartHeaders = await cartSession.getCartHeaders()

    // Call backend reserve-stock endpoint
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart/reserve-stock`, {
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
    // A 409 names the lines that could not be held; the client turns it
    // into the per-line alert (`parseInsufficientStockError`). Returned with
    // its status like every upstream 4xx, so the body is `error.data`.
    if (error instanceof FetchError && error.statusCode === 409) {
      const errorData = error.data as Record<string, unknown> | undefined
      log.warn({
        action: 'checkout:reserveStock:insufficientStock',
        detail: errorData?.detail,
      })
      setResponseStatus(event, 409)
      return {
        code: 'insufficient_stock',
        detail: errorData?.detail,
        failedItems: errorData?.failed_items ?? errorData?.failedItems,
      } as never
    }
    // Any other upstream 4xx (bad cart, expired session) is forwarded as is.
    return handleError(event, error)
  }
})
