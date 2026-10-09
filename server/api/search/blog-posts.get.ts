import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

/**
 * Blog post search: the search page's guides, paged on their own.
 *
 * `/api/search` asks for products and posts with ONE limit and offset,
 * so its posts follow whatever page of products is open. The search
 * page pages the two separately — products here through
 * `/api/products/search`, guides through this route.
 *
 * @example
 * GET /api/search/blog-posts?query=power%20bank&languageCode=el&limit=3
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log

  try {
    const query = await getValidatedQuery(event, zApiV1SearchBlogPostRetrieveQuery)

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/search/blog/post`, {
      method: 'GET',
      query: {
        query: query.query,
        language_code: query.languageCode,
        limit: query.limit,
        offset: query.offset,
      },
    })

    const validatedResponse = await parseDataAs(response, zBlogPostMeiliSearchResponse)
    wideLog?.set({ search: { query: query.query, resultCount: validatedResponse.results.length } })
    return validatedResponse
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'SearchBlogPostViewSet',
  // Same policy as the product search: identical queries are cached
  // briefly for load relief, never served stale.
  maxAge: 60,
  swr: false,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.languageCode || '',
      query.limit || '',
      query.offset || '',
      query.query || '',
    ]
    return tenantCacheKey(event, `search:blog-posts:${keyParts.join(':')}`)
  },
})
