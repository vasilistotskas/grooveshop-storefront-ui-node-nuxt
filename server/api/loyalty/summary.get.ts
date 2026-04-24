const fetchLoyaltySummary = defineCachedFunction(
  async () => {
    const config = useRuntimeConfig()
    const response = await $fetch(`${config.apiBaseUrl}/loyalty/summary`, {
      method: 'GET',
    })
    return parseDataAs(response, zGetLoyaltySummaryResponse)
  },
  {
    name: 'LoyaltySummaryAnon',
    maxAge: 300, // 5 minutes for unauthenticated summary
    staleMaxAge: 600,
    swr: true,
    getKey: () => 'loyalty:summary:anon',
  },
)

export default defineEventHandler(async (event) => {
  const accessToken = await getAllAuthAccessToken(event)

  try {
    if (accessToken) {
      // Authenticated request — always fetch live, never cache user-specific data
      const config = useRuntimeConfig()
      const response = await $fetch(`${config.apiBaseUrl}/loyalty/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return await parseDataAs(response, zGetLoyaltySummaryResponse)
    }

    // Unauthenticated — serve from cache
    return await fetchLoyaltySummary()
  }
  catch (error) {
    await handleError(error)
  }
})
