const fetchLoyaltySummary = defineCachedFunction(
  async (tenantKey: string) => {
    const config = useRuntimeConfig()
    // Forward the tenant host explicitly — relying on the global $fetch
    // patch breaks under SWR revalidation where useEvent() is absent
    // and the patch falls back to the platform host.
    const response = await $fetch(`${config.apiBaseUrl}/loyalty/summary`, {
      method: 'GET',
      headers: { 'X-Forwarded-Host': tenantKey },
    })
    return parseDataAs(response, zGetLoyaltySummaryResponse)
  },
  {
    name: 'LoyaltySummaryAnon',
    maxAge: 300, // 5 minutes for unauthenticated summary
    staleMaxAge: 600,
    swr: true,
    // Keyed by tenant host — Django's /loyalty/summary resolves the
    // tenant from X-Forwarded-Host, so responses differ per tenant and
    // must not share a cache slot.
    getKey: (tenantKey: string) => `loyalty:summary:anon:${tenantKey}`,
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

    // Unauthenticated — serve from cache, keyed per tenant host.
    const host = getRequestHost(event, { xForwardedHost: false })
    return await fetchLoyaltySummary(host)
  }
  catch (error) {
    handleError(error)
  }
})
