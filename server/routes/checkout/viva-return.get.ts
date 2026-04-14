import * as z from 'zod'

const vivaResolveOrderResponse = z.object({ uuid: z.string() })

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const backendFetch = useBackendFetch()
  const query = await getValidatedQuery(event, z.object({
    s: z.string().max(64).optional(),
    t: z.string().max(64).optional(),
  }).parse)

  const orderCode = query.s
  const transactionId = query.t

  if (!orderCode) {
    return sendRedirect(event, '/checkout?error=missing_order_code')
  }

  try {
    const result = await backendFetch(
      `${config.djangoUrl}/viva-wallet/resolve-order`,
      { query: { order_code: orderCode } },
    )

    const parsed = vivaResolveOrderResponse.parse(result)

    const params = new URLSearchParams()
    if (transactionId) params.set('t', transactionId)
    if (orderCode) params.set('s', orderCode)

    return sendRedirect(
      event,
      `/checkout/success/${parsed.uuid}?${params.toString()}`,
    )
  }
  catch (error: any) {
    log.error({ action: 'vivaReturn:resolveOrder', error })
    return sendRedirect(event, '/checkout?error=payment_not_found')
  }
})
