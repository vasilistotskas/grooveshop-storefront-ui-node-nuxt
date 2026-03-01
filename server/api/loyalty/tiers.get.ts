import { z } from 'zod'

export default defineEventHandler(async (event) => {
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
})
