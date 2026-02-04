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

export default defineEventHandler(
  async (event) => {
    const config = useRuntimeConfig()

    try {
      // Get query parameters from request
      const queryParams = getQuery(event)

      // Validate query parameters with auto-imported Zod schema
      const query = await getValidatedQuery(
        event,
        zSearchProductRetrieveData.shape.query.parse,
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
      // Handle attributeValues parameter (can be single value or comma-separated string)
      const attributeValues = queryParams.attributeValues || queryParams.attributeValue
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

      // Return with proper typing from auto-generated OpenAPI types
      return validatedResponse as ProductMeiliSearchResponse
    }
    catch (error) {
      await handleError(error)
    }
  },
)
