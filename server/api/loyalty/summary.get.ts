import { defineCachedFunction } from 'nitropack/runtime'
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

const fetchLoyaltySummary = defineCachedFunction(
  async (tenantKey: string, locale: string) => {
    const config = useRuntimeConfig()
    // The store and language the entry is keyed by: a cached function
    // revalidates with no request of its own.
    const response = await backendFetchFor({ tenantHost: tenantKey, locale })(`${config.apiBaseUrl}/loyalty/summary`, {
      method: 'GET',
    })
    return parseDataAs(response, zGetLoyaltySummaryResponse)
  },
  {
    name: 'LoyaltySummaryAnon',
    maxAge: 300, // 5 minutes for unauthenticated summary
    staleMaxAge: 600,
    swr: true,
    // Keyed by tenant host and locale — Django's /loyalty/summary
    // resolves the tenant from X-Forwarded-Host and answers in the
    // X-Language it is sent, so responses differ per tenant and per
    // language and must not share a cache slot.
    getKey: (tenantKey: string, locale: string) => `loyalty:summary:anon:${tenantKey}:${locale}`,
  },
)

export default defineEventHandler(async (event) => {
  const accessToken = await getAllAuthAccessToken(event)

  try {
    if (accessToken) {
      // Authenticated request — always fetch live, never cache user-specific data
      const config = useRuntimeConfig()
      const response = await useBackendFetch(event)(`${config.apiBaseUrl}/loyalty/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return await parseDataAs(response, zGetLoyaltySummaryResponse)
    }

    // Unauthenticated — serve from cache, keyed per tenant host.
    const host = requestTenantHost(event)
    return await fetchLoyaltySummary(host, requestLocale(event))
  }
  catch (error) {
    handleError(event, error)
  }
})
