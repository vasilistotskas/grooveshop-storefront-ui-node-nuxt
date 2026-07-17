export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product`, {
      method: 'GET',
      query,
      headers: createHeaders(null, null),
    })
    return await parseDataAs(response, zListProductResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ProductViewSet',
  // Sort/filter-sensitive listing: never serve stale results (a stale entry
  // can show the wrong order after a backend change). Cache identical queries
  // for load relief, but always fetch fresh on expiry rather than SWR.
  maxAge: 300, // Cache for 5 minutes
  swr: false,
  getKey: (event) => {
    const query = getQuery(event)
    // Build a stable, canonicalized key from every param that affects the response.
    // Sort keys so that param order in the URL doesn't produce different cache entries.
    const filtered = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.slice().sort().join(',') : v}`)
      .sort()
      .join('&')
    return `products:${filtered || 'default'}`
  },
})
