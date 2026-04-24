import { z } from 'zod'

/**
 * Product search API route with advanced filtering
 *
 * This route proxies requests to the Django backend's Meilisearch product search endpoint
 * with support for full-text search, price range, popularity, view count, category filters,
 * and attribute value filtering.
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

// Extend the auto-generated schema to also accept the plural `attributeValues` alias
// sent by the Products/List component
const zSearchProductQuery = zSearchProductRetrieveQuery.extend({
  attributeValues: z.string().optional(),
})

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = useLogger(event)

  try {
    // Validate query parameters — includes both attributeValue (OpenAPI) and attributeValues (client alias)
    const query = await getValidatedQuery(
      event,
      zSearchProductQuery.parse,
    )

    // Ensure query is defined (validation should guarantee this)
    if (!query) {
      throw createError({
        statusCode: 400,
        message: 'Invalid query parameters',
      })
    }

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
    if (query.sort) backendQuery.sort = query.sort

    // Add attribute value filtering support
    // Accept both plural (client alias) and singular (OpenAPI field name)
    const attributeValues = query.attributeValues || query.attributeValue
    if (attributeValues) {
      // Pass as comma-separated string to backend
      backendQuery.attribute_value = attributeValues
    }

    // Fetch from Django backend
    const response = await $fetch(`${config.apiBaseUrl}/search/product`, {
      method: 'GET',
      query: backendQuery,
    })

    // Validate and parse response with auto-imported Zod schema
    const validatedResponse = await parseDataAs(response, zProductMeiliSearchResponse)

    wideLog.set({ search: { query: query.query, resultCount: validatedResponse.results?.length ?? 0 } })

    // Return with proper typing from auto-generated OpenAPI types
    return validatedResponse as ProductMeiliSearchResponse
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'SearchProductViewSet',
  maxAge: 60, // Cache for 1 minute — Meilisearch is near-real-time
  staleMaxAge: 300, // Serve stale for 5 minutes while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.attributeValues || query.attributeValue || '',
      query.categories || '',
      query.facets || '',
      query.languageCode || '',
      query.likesMin || '',
      query.limit || '20',
      query.offset || '0',
      query.priceMax || '',
      query.priceMin || '',
      query.query || '',
      query.sort || '',
      query.viewsMin || '',
    ]
    return tenantCacheKey(event, `search:products:${keyParts.join(':')}`)
  },
})
