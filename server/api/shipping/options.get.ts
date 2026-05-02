/**
 * Shipping options proxy.
 *
 * Forwards to Django's ``GET /api/v1/shipping/options`` so the checkout
 * sidebar can read authoritative per-(provider, kind) pricing — same
 * source the order-create path consults. With ``ACS_DYNAMIC_PRICING_
 * ENABLED`` on, this returns the ACS live quote bucketed against the
 * cart's actual weight bracket so the displayed Μεταφορικά match what
 * the voucher mint will charge.
 *
 * Cached briefly per (country, total, currency, weight) tuple — the
 * upstream ACS quote is already cached 5 min on the backend, but a
 * thin Nitro layer keeps duplicate calls during reactive dep churn
 * cheap.
 */

const zQuery = zListShippingOptionsQuery

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    const headers = createHeaders()
    try {
      const query = await getValidatedQuery(event, zQuery.parse)

      const raw = await $fetch(
        `${config.apiBaseUrl}/shipping/options`,
        {
          method: 'GET',
          query: {
            countryCode: query.countryCode,
            orderValueAmount: query.orderValueAmount,
            currency: query.currency,
            weightGrams: query.weightGrams,
          },
          headers,
        },
      )

      return parseDataAs(raw, zListShippingOptionsResponse)
    }
    catch (error) {
      await handleError(error)
    }
  },
  {
    // Short TTL — pricing changes (free-shipping toggles, ACS tariff
    // updates) should propagate to the picker within a minute. The
    // backend ACS quote is already 5-min cached so the worst-case
    // upstream load is one ACS API hit per (country, weight bucket)
    // every 5 minutes.
    maxAge: 60,
    staleMaxAge: 60 * 5,
    name: 'shipping.options',
    getKey: (event) => {
      const url = new URL(event.node.req.url ?? '/', 'http://internal')
      const p = url.searchParams
      return [
        p.get('countryCode') ?? '',
        p.get('orderValueAmount') ?? '',
        p.get('currency') ?? '',
        p.get('weightGrams') ?? '',
      ].join('|')
    },
  },
)
