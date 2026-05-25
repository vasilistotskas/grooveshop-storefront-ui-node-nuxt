/**
 * Free-shipping info proxy.
 *
 * Forwards to Django's ``GET /api/v1/shipping/free-shipping-info`` so
 * the PDP and the cart summary can render "Δωρεάν μεταφορικά άνω
 * των X €" against the same per-carrier thresholds that drive the
 * checkout pricing path. Returning the per-(provider, kind) breakdown
 * alongside the aggregate min/max keeps the contract scalable — adding
 * a new carrier only requires its adapter to override
 * ``free_shipping_threshold``; the frontend picks the new row up
 * automatically.
 *
 * Cached briefly per (country, currency) tuple because:
 *  - thresholds are admin-tunable in ``extra_settings`` but change
 *    rarely; a stale read of a few minutes is acceptable;
 *  - SWR keeps the PDP/cart paint cheap even when the response is
 *    revalidating.
 */

const zQuery = zGetFreeShippingInfoQuery
const zResponse = zGetFreeShippingInfoResponse

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    const headers = createHeaders()
    try {
      const query = await getValidatedQuery(event, zQuery.parse)

      const raw = await $fetch(
        `${config.apiBaseUrl}/shipping/free-shipping-info`,
        {
          method: 'GET',
          query: {
            countryCode: query.countryCode,
            currency: query.currency,
          },
          headers,
        },
      )

      return parseDataAs(raw, zResponse)
    }
    catch (error) {
      handleError(error)
    }
  },
  {
    maxAge: 60,
    staleMaxAge: 60 * 5,
    name: 'shipping.freeShippingInfo',
    getKey: (event) => {
      const url = new URL(event.node.req.url ?? '/', 'http://internal')
      const p = url.searchParams
      // tenantCacheKey prefix is mandatory: thresholds come from each
      // tenant's extra_settings schema, so two tenants sharing the same
      // (country, currency) must NOT share a cache slot.
      return tenantCacheKey(
        event,
        `shipping-free-info:${p.get('countryCode') ?? ''}|${p.get('currency') ?? ''}`,
      )
    },
  },
)
