import { useRuntimeConfig } from 'nuxt/server'

/**
 * The store's shipping policy: one row per (country, carrier, kind) it
 * delivers with, its price, free-shipping threshold, delivery days and
 * weight cap. The Organization node every page carries builds its
 * `hasShippingService` from it (`app.vue`).
 *
 * The same rows for every visitor, so cached per store; Django purges
 * `shipping.policy` with the shipping surface when a rate changes.
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/shipping/policy`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    return await parseDataAs(response, zGetShippingPolicyResponse)
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
