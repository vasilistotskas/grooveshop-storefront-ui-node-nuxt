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
  const getPaymentStatus = async (
    orderId: string | number,
    orderUuid?: string,
    signal?: AbortSignal,
  ): Promise<any> => {
    try {
      const response = await $fetch(`/api/orders/${orderId}/payment-status`, {
        method: 'GET',
        query: orderUuid ? { uuid: orderUuid } : undefined,
        signal,
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
   * @param signal - Optional AbortSignal to cancel the poll (e.g. on
   *   route change). When aborted, the pending $fetch is canceled and
   *   the sleep between attempts short-circuits.
   * @returns Final payment status
   */
  const pollPaymentStatus = async (
    orderId: string | number,
    maxAttempts = 10,
    interval = 2000,
    orderUuid?: string,
    signal?: AbortSignal,
  ): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const status = await getPaymentStatus(orderId, orderUuid, signal)

      // Check if payment reached a final state. PROCESSING is a
      // transitional Stripe state (payment in flight) — treating it as
      // terminal caused the UI to stop polling before a real outcome.
      if (['COMPLETED', 'FAILED', 'CANCELED'].includes(status.status)) {
        return status
      }

      // Abortable sleep — drops the setTimeout as soon as the signal fires.
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, interval)
        const onAbort = () => {
          clearTimeout(timer)
          signal?.removeEventListener('abort', onAbort)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
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

  /**
   * Subscribe to server-sent payment-status updates for an order.
   *
   * Opens an EventSource against the Nuxt SSE endpoint which proxies
   * Redis pub/sub messages emitted by Django webhooks. Resolves as
   * soon as the server reports a terminal status (COMPLETED / FAILED /
   * CANCELED). Falls back to pollPaymentStatus if the browser lacks
   * EventSource, the connection fails before a terminal state, or the
   * provided signal aborts.
   *
   * @param orderId - The order ID
   * @param orderUuid - Optional UUID for guest order access
   * @param signal - Optional AbortSignal to cancel the stream
   * @returns Final payment status (same shape as pollPaymentStatus)
   */
  const streamPaymentStatus = async (
    orderId: string | number,
    orderUuid?: string,
    signal?: AbortSignal,
  ): Promise<any> => {
    if (typeof EventSource === 'undefined') {
      return pollPaymentStatus(orderId, 10, 2000, orderUuid, signal)
    }

    const url = new URL(
      `/api/orders/${orderId}/payment-status/stream`,
      window.location.origin,
    )
    if (orderUuid) url.searchParams.set('uuid', orderUuid)

    return new Promise((resolve, reject) => {
      const source = new EventSource(url.toString(), { withCredentials: true })
      let settled = false

      const finish = (value: any, reason: 'resolve' | 'reject') => {
        if (settled) return
        settled = true
        source.close()
        signal?.removeEventListener('abort', onAbort)
        if (reason === 'resolve') resolve(value)
        else reject(value)
      }

      const onAbort = () => {
        finish(new DOMException('Aborted', 'AbortError'), 'reject')
      }
      if (signal?.aborted) return onAbort()
      signal?.addEventListener('abort', onAbort, { once: true })

      const onMessage = (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data)
          const status = data.paymentStatus ?? data.status
          if (['COMPLETED', 'FAILED', 'CANCELED'].includes(status)) {
            finish({ ...data, status }, 'resolve')
          }
        }
        catch (err) {
          log.error({ action: 'checkout:streamPaymentStatus:parse', error: err })
        }
      }

      source.addEventListener('payment-status', onMessage as EventListener)
      source.addEventListener('message', onMessage as EventListener)

      source.onerror = async () => {
        // Browser auto-reconnects EventSource on transient drops. If
        // readyState is CLOSED the server gave up — fall back to
        // polling so the user isn't left staring at a spinner.
        if (source.readyState === EventSource.CLOSED) {
          source.close()
          signal?.removeEventListener('abort', onAbort)
          try {
            const result = await pollPaymentStatus(orderId, 10, 2000, orderUuid, signal)
            finish(result, 'resolve')
          }
          catch (err) {
            finish(err, 'reject')
          }
        }
      }
    })
  }

  return {
    reserveStock,
    releaseReservations,
    createPaymentIntentFromCart,
    getPaymentStatus,
    pollPaymentStatus,
    streamPaymentStatus,
    retryPayment,
  }
}
