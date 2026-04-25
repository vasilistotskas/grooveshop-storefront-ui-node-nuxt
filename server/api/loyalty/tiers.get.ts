import { z } from 'zod'

/**
 * Loyalty tiers — static reference data (tier names, XP thresholds, multipliers).
 *
 * Django's LoyaltyViewSet currently gates ALL actions behind IsAuthenticated,
 * including tiers. Tiers are identical for every user; they contain no
 * per-user state. The correct long-term fix is to add
 * `@action(permission_classes=[AllowAny])` in Django so this endpoint becomes
 * truly public and can be safely cached without any auth context.
 *
 * Until that Django change lands, this route is NOT cached — it always
 * forwards the caller's auth token, which is the only way to get a 200 from
 * Django. The client-side useAsyncData('loyalty-tiers') in useLoyalty.ts
 * deduplicates and re-uses the SSR payload on the client, so the absence of
 * server-side caching here has minimal performance impact.
 *
 * DO NOT use defineCachedEventHandler here while auth state is read inside
 * the handler. Mixing auth tokens and shared cache keys serves one user's
 * data to another (cache poisoning).
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const data = await $fetch(`${config.apiBaseUrl}/loyalty/tiers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // Django returns a plain array (not paginated) for tiers
    return await parseDataAs(data, z.array(zLoyaltyTier))
  }
  catch (error) {
    await handleError(error)
  }
})
