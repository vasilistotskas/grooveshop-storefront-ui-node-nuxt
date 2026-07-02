import * as z from 'zod'

// Viva Smart Checkout redirects the customer to the portal-configured
// success/failure URL and appends (per developer.viva.com → Smart
// Checkout integration):
//   t       transaction id (UUID) — may be ABSENT on failed payments
//   s       the 16-digit order code of the payment order
//   lang    ISO 639 language of the destination page
//   eventId int32 Viva event code (e.g. 10051 = insufficient funds)
//   eci     Electronic Commerce Indicator (3DS outcome)
//
// This server route translates those params into the order UUID via
// the public ``/order/viva_return`` endpoint (``t`` → payment_id once
// the webhook has landed, ``s`` → the viva_order_code stored at
// session creation — so it resolves during the browser-vs-webhook
// race) and 302s the customer to the canonical success page. The
// success page reads ``s`` (``fromViva``) to kick off its
// payment-status polling.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const backendFetch = useBackendFetch()
  const query = await getValidatedQuery(event, z.object({
    t: z.string().max(64).optional(),
    s: z.string().max(64).optional(),
  }).loose().parse)

  const transactionId = query.t
  const orderCode = query.s

  if (!transactionId && !orderCode) {
    log.warn('vivaReturn', 'redirect landed without t or s params')
    return sendRedirect(event, '/cart?paymentError=lookup')
  }

  try {
    const result = await backendFetch(
      `${config.apiBaseUrl}/order/viva_return`,
      { query: { t: transactionId, s: orderCode } },
    )

    const parsed = zVivaReturnLookupResponse.parse(result)

    log.info('vivaReturn', 'resolved order, forwarding to success page', {
      orderId: parsed.id,
      paymentStatus: parsed.paymentStatus,
      via: transactionId ? 't' : 's',
    })

    const params = new URLSearchParams()
    if (orderCode) params.set('s', orderCode)
    if (transactionId) params.set('t', transactionId)

    return sendRedirect(
      event,
      `/checkout/success/${parsed.uuid}?${params.toString()}`,
    )
  }
  catch (error: unknown) {
    log.error({
      action: 'vivaReturn:resolveOrder',
      error,
      transactionId,
      orderCode,
    })
    return sendRedirect(event, '/cart?paymentError=lookup')
  }
})
