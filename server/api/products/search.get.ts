import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

/**
 * Product search API route with advanced filtering
 *
 * This route proxies requests to the Django backend's Meilisearch product search endpoint
 * with support for full-text search, price range, popularity, view count, category filters,
 * attribute value filtering, brands, in-stock and on-offer.
 *
 * Features:
 * - Query parameter validation with Zod
 * - Facet support for dynamic filter UI
 * - Attribute value filtering support
 * - Error handling
 *
 * @example
 * GET /api/products/search?q=laptop&priceMin=500&priceMax=1500&categories=1,2&attributeValues=10,20&facets=category,final_price,attribute_values
 */

const zSearchProductQuery = zApiV1SearchProductRetrieveQuery

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log

  try {
    // Validate query parameters — includes both attributeValue (OpenAPI) and attributeValues (client alias)
    const query = await getValidatedQuery(
      event,
      zSearchProductQuery,
    )

    // Transform camelCase to snake_case for Django backend
    const backendQuery: Record<string, any> = {
      query: query.query || '',
      language_code: query.languageCode,
      limit: query.limit || 20,
      offset: query.offset || 0,
      // Add default facets if not provided - include attribute_values for filtering
      facets: query.facets || 'category,final_price,likes_count,view_count,attribute_values',
    }

    // Add optional filter parameters if provided
    if (query.priceMin !== undefined) backendQuery.price_min = query.priceMin
    if (query.priceMax !== undefined) backendQuery.price_max = query.priceMax
    if (query.likesMin !== undefined) backendQuery.likes_min = query.likesMin
    if (query.viewsMin !== undefined) backendQuery.views_min = query.viewsMin
    if (query.categories) backendQuery.categories = query.categories
    if (query.brands) backendQuery.brands = query.brands
    // The flags go on as the schema parsed them ('true' / '1' / true); Django refuses anything else with a 400.
    if (query.inStock !== undefined) backendQuery.in_stock = query.inStock
    if (query.onOffer !== undefined) backendQuery.on_offer = query.onOffer
    if (query.sort) backendQuery.sort = query.sort

    // Pass attribute value filter (comma-separated IDs) to backend.
    if (query.attributeValues) {
      backendQuery.attributeValues = query.attributeValues
    }

    // Fetch from Django backend
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/search/product`, {
      method: 'GET',
      query: backendQuery,
    })

    // Validate and parse response with auto-imported Zod schema
    const validatedResponse = await parseDataAs(response, zProductMeiliSearchResponse)

    wideLog?.set({ search: { query: query.query, resultCount: validatedResponse.results?.length ?? 0 } })

    // Return with proper typing from auto-generated OpenAPI types
    return validatedResponse as ProductMeiliSearchResponse
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'SearchProductViewSet',
  // Search results are sort/filter-sensitive: never serve them stale. A
  // stale-while-revalidate entry can surface the wrong order after a backend
  // change (e.g. a sort-mapping fix) until it revalidates. Cache identical
  // queries briefly for load relief, but always fetch fresh on expiry.
  maxAge: 60, // Cache for 1 minute — Meilisearch is near-real-time
  swr: false,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.attributeValues || '',
      query.brands || '',
      query.categories || '',
      query.facets || '',
      query.inStock || '',
      query.languageCode || '',
      query.likesMin || '',
      query.limit || '20',
      query.offset || '0',
      query.onOffer || '',
      query.priceMax || '',
      query.priceMin || '',
      query.query || '',
      query.sort || '',
      query.viewsMin || '',
    ]
    return tenantCacheKey(event, `search:products:${keyParts.join(':')}`)
  },
})
