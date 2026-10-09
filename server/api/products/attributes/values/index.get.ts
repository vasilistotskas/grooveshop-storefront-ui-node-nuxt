import { z } from 'zod'
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

/**
 * Fetch all product attribute values
 *
 * Returns all attribute values with translated values.
 * Used to populate the attribute filter UI and for name lookups.
 *
 * @example
 * GET /api/products/attributes/values?languageCode=el&active=true
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()

  try {
    // Get and validate query parameters
    const query = await getValidatedQuery(event, z.object({
      languageCode: z.string().optional(),
    }).passthrough())

    // Build the backend query
    const backendQuery: Record<string, unknown> = {
      language_code: query.languageCode || 'el',
      active: true, // Only fetch active attribute values
      page_size: 500, // Get up to 500 attribute values (should cover most catalogs)
    }

    // Fetch attribute values from Django backend
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/attribute/value`, {
      method: 'GET',
      query: backendQuery,
    })

    // Validate response with auto-imported Zod schema
    return await parseDataAs(response, zListAttributeValueResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'ProductAttributeValueViewSet',
  maxAge: 60 * 5, // 5 minutes cache - attribute values don't change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    return tenantCacheKey(event, `product-attribute-values:${query.languageCode || 'el'}`)
  },
})
