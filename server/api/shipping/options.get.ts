import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

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
 * Django also says, per option, whether the visitor's cart fits that
 * carrier's parcels (``exceedsParcelSize``), so the request names the
 * cart the way every cart route does (``getCartIdentityHeaders``).
 *
 * Cached briefly per (country, total, currency, weight) tuple — the
 * upstream ACS quote is already cached 5 min on the backend, but a
 * thin Nitro layer keeps duplicate calls during reactive dep churn
 * cheap. Only a request that names no cart is cached: its answer is
 * the same for every cart-less visitor, while one cart's fit is that
 * visitor's alone.
 */

const zQuery = zListShippingOptionsQuery

export default defineCachedRoute(
  async (event) => {
    const config = useRuntimeConfig()
    try {
      const query = await getValidatedQuery(event, zQuery)
      const headers = {
        ...createHeaders(event),
        ...await getCartIdentityHeaders(event),
      }

      const raw = await useBackendFetch(event)(
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

      return await parseDataAs(raw, zListShippingOptionsResponse)
    }
    catch (error) {
      return handleError(event, error)
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
    shouldBypassCache: async event => Object.keys(await getCartIdentityHeaders(event)).length > 0,
    // Nitro hands a cached handler only the headers named here. The
    // handler reads the cart session from the cookies; the entry is
    // still keyed by ``getKey`` alone, which never reads them.
    varies: ['cookie'],
    getKey: (event) => {
      const url = new URL(event.node.req.url ?? '/', 'http://internal')
      const p = url.searchParams
      const paramsKey = [
        p.get('countryCode') ?? '',
        p.get('orderValueAmount') ?? '',
        p.get('currency') ?? '',
        p.get('weightGrams') ?? '',
      ].join('|')
      return tenantCacheKey(event, paramsKey)
    },
  },
)
