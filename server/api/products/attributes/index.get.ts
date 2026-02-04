/**
 * Fetch all product attributes with their values
 *
 * Returns attributes grouped by type with translated names and values.
 * Used to populate the attribute filter UI.
 *
 * @example
 * GET /api/products/attributes?languageCode=el&active=true
 */
export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    // Get query parameters
    const query = getQuery(event)

    // Build the backend query
    const backendQuery: Record<string, unknown> = {
      language_code: query.languageCode || 'en',
      active: true, // Only fetch active attributes
      page_size: 100, // Get up to 100 attributes (should be enough for most cases)
    }

    // Fetch attributes from Django backend
    const response = await $fetch(`${config.apiBaseUrl}/product/attribute`, {
      method: 'GET',
      query: backendQuery,
    })

    // Validate response with auto-imported Zod schema
    return await parseDataAs(response, zListAttributeResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductAttributeViewSet',
  maxAge: 60 * 5, // 5 minutes cache - attributes don't change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
})
