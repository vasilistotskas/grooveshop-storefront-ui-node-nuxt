import { z } from 'zod'
import { useRuntimeConfig } from 'nuxt/server'

/**
 * Loyalty tiers — the store's tier ladder: names, the level each starts
 * at, what each multiplies.
 *
 * Public reference data, identical for every visitor of a store: Django
 * serves the `tiers` action with `AllowAny` (behind the programme's plan
 * and runtime gates, which 404 when it is off), because `/loyalty-program`
 * and the homepage's Rewards band exist to sell the programme to people
 * who have not joined it. So no auth is read here, and the answer is
 * cached per store like any other public read.
 */
export default defineCachedRoute(
  async (event) => {
    const config = useRuntimeConfig()

    try {
      // useBackendFetch: X-Forwarded-Host resolves the caller's schema.
      const data = await useBackendFetch(event)(`${config.apiBaseUrl}/loyalty/tiers`, {
        method: 'GET',
      })

      // Django returns a plain array (not paginated) for tiers
      return await parseDataAs(data, z.array(zLoyaltyTier))
    }
    catch (error) {
      handleError(event, error)
    }
  },
  {
    name: 'loyalty-tiers',
    maxAge: 300,
    staleMaxAge: 600,
    swr: true,
    getKey: event => tenantCacheKey(event, 'loyalty-tiers'),
  },
)
