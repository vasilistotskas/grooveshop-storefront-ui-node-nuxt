import { getQuery } from 'h3'
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * Trending Search Queries proxy.
 *
 * Forwards to Django's `/search/trending` which aggregates SearchQuery
 * over the last 24h and caches the result for 5 minutes in Redis.
 *
 * Cached for the same 5 minutes: the answer is the store's, not a
 * visitor's, and the palette asks on every open.
 */

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListTrendingSearchesQuery)
    const backendQuery: Record<string, unknown> = {}
    if (query.languageCode) backendQuery.language_code = query.languageCode
    if (query.contentType) backendQuery.content_type = query.contentType
    if (query.limit != null) backendQuery.limit = query.limit

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/search/trending`, {
      method: 'GET',
      query: backendQuery,
    })

    return await parseDataAs(response, zListTrendingSearchesResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'SearchTrending',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: event => tenantCacheKey(event, `search-trending:${JSON.stringify(getQuery(event))}`),
})
