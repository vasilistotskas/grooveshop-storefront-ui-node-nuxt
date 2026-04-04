import { z } from 'zod'

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const data = await $fetch(`${config.apiBaseUrl}/loyalty/tiers`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    // Django returns a plain array (not paginated) for tiers
    return await parseDataAs(data, z.array(zLoyaltyTier))
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'LoyaltyTierViewSet',
  maxAge: 3600, // Tiers are static reference data — cache for 1 hour
  staleMaxAge: 7200,
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    return `loyalty:tiers:${query.languageCode || 'default'}`
  },
})
