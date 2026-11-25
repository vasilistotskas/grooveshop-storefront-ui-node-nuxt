import { useRuntimeConfig } from 'nuxt/server'

/**
 * The store's shipping policy: one row per (country, carrier, kind) it
 * delivers with, its price, free-shipping threshold, delivery days and
 * weight cap. The Organization node every page carries builds its
 * `hasShippingService` from it (`app.vue`), and the store's promises read
 * it (`useStoreAssuranceFacts`).
 *
 * A row of a store that delivers home only to some regions of a country
 * names them (`regionCodes`). Each row carries those regions' records
 * (`ShippingPolicyRow`), read from Django's unpaginated list of the
 * country's regions, one read per such country, in parallel, so a page
 * names them in its language without a request of its own. A store with
 * no regional row makes no second read.
 *
 * The same rows for every visitor, so cached per store; Django purges
 * `shipping.policy` with the shipping surface when a rate or a zone
 * changes. A region renamed reaches this cache when it expires.
 */
export default defineCachedRoute(async (event): Promise<ShippingPolicyRow[]> => {
  const config = useRuntimeConfig()
  const backendFetch = useBackendFetch(event)
  try {
    const response = await backendFetch(
      `${config.apiBaseUrl}/shipping/policy`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    const entries = await parseDataAs(response, zGetShippingPolicyResponse)

    const regionalCountries = [...new Set(
      entries.filter(entry => entry.regionCodes.length > 0).map(entry => entry.countryCode),
    )]
    const regionLists = await Promise.all(regionalCountries.map(async country =>
      parseDataAs(
        await backendFetch(
          `${config.apiBaseUrl}/region/${encodeURIComponent(country)}/get_regions_by_country_alpha_2`,
          { method: 'GET', headers: createHeaders(event, null, null) },
        ),
        zListRegionsByCountryResponse,
      ),
    ))
    const regions = new Map(regionLists.flat().map(region => [region.alpha, region]))

    return entries.map(entry => ({
      ...entry,
      regions: entry.regionCodes.flatMap(code => regions.get(code) ?? []),
    }))
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'shipping.policy',
  maxAge: 60 * 30,
  staleMaxAge: 60 * 60 * 24,
  swr: true,
  getKey: event => tenantCacheKey(event, 'shipping-policy'),
})
