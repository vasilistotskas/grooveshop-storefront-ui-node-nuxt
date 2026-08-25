import * as z from 'zod'

/**
 * Poll a gift-card purchase while the provider webhook races the
 * browser redirect. The purchase UUID is unguessable — same access
 * model as guest orders.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(
      event,
      z.object({ uuid: z.uuid() }).parse,
    )

    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/giftcard/purchase-status`,
      { query },
    )

    return await parseDataAs(response, zGiftCardPurchaseStatusResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(error)
  }
})
