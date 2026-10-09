import { z } from 'zod'
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListCountryQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/country`, {
      method: 'GET',
      query,
    })
    // ``pagination=false`` is how the WHOLE list arrives in one request:
    // DRF caps a page at 100 rows (``max_page_size``) and the table has
    // ~250, so ``pageSize`` alone cannot do it. Django then answers a
    // bare array; it is re-wrapped so readers keep reading ``results``.
    if (query.pagination === 'false') {
      const results = await parseDataAs(response, z.array(zCountry))
      return { count: results.length, results }
    }
    return await parseDataAs(response, zListCountryResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'CountryViewSet',
  // Countries are admin-reorderable (unfold drag-drop edits ``sort_order``),
  // so the list is NOT static — a 24h TTL hid admin reorders for up to a
  // day because ``maxAge`` is the no-revalidation window. Match the
  // pay-way window so an admin change surfaces within minutes.
  maxAge: 60 * 5, // 5 minutes
  staleMaxAge: 60 * 30, // serve stale up to 30 min while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '250',
      query.languageCode || 'el',
      // Distinct cache entry for the shippable-only list (checkout,
      // address book) vs. the full list (account profile) — same
      // query params otherwise, different response bodies.
      query.shippable ?? 'all',
      query.hasPhoneCode ?? 'any',
      query.pagination ?? 'true',
    ]
    return tenantCacheKey(event, `countries:${keyParts.join(':')}`)
  },
})
