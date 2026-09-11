import { FetchError } from 'ofetch'

export default defineCachedEventHandler(async (event): Promise<ContentPageResponse> => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveContentPagePath.parse,
    )
    // useBackendFetch: ContentPage rows are per-tenant — a raw $fetch
    // carries no X-Forwarded-Host, Django would resolve the public
    // schema and every tenant would get a 404 (same reasoning as
    // page-config/[pageType].get.ts).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/content-page/${params.slug}`,
      { method: 'GET' },
    )
    return { page: await parseDataAs(response, zRetrieveContentPageResponse) }
  }
  catch (error) {
    // Django's 404 is "no published page at this slug" — the normal
    // state for every legal page a merchant has not written, which
    // ``useLegalPage`` probes for on every render. It is data, not a
    // fault: return the absent state so the SWR cache stores it (a
    // thrown error is never cached, so each SSR of /terms-of-use,
    // /privacy-policy and /cookies-policy cost a Django round-trip)
    // and so the request log stops carrying a warning plus stack trace
    // per render. Every other failure — 5xx, network, schema mismatch
    // — still propagates, so /info/[slug] can tell a missing page apart
    // from an outage. See shared/types/contentPage.ts.
    if (error instanceof FetchError && error.statusCode === 404) {
      return { page: null }
    }
    return handleError(error)
  }
}, {
  name: 'ContentPageDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60 * 2,
  swr: true,
  getKey: (event) => {
    const params = getRouterParams(event)
    return tenantCacheKey(event, `content-page:${params.slug}`)
  },
})
