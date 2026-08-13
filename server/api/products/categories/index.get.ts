import { z } from 'zod'

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = await getValidatedQuery(event, z.object({
    idIn: z.union([z.string(), z.array(z.string())]).optional(),
    languageCode: z.string().optional(),
    pageSize: z.union([z.number(), z.string()]).optional(),
  }).passthrough().parse)

  // Build the backend query, mapping frontend params to Django filter params
  const backendQuery: Record<string, unknown> = { ...query }

  // Map idIn to id__in for Django filter
  if (query.idIn) {
    backendQuery.id__in = query.idIn
    delete backendQuery.idIn
  }

  try {
    const response = await $fetch(`${config.apiBaseUrl}/product/category`, {
      method: 'GET',
      query: backendQuery,
      headers: createHeaders(null, null),
    })
    return await parseDataAs(response, zListProductCategoryResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ProductCategoryViewSet',
  maxAge: 60 * 60, // 1 hour cache - categories rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    // The Zod schema uses .passthrough(), so ANY extra query param is
    // forwarded to Django and changes the upstream response — the key
    // must therefore cover the whole query, not an allowlist, or two
    // different requests collide on one cache entry. Same canonicalized
    // pattern as products/index.get.ts: drop empties, sort keys.
    const filtered = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.slice().sort().join(',') : v}`)
      .sort()
      .join('&')
    return `categories:${filtered || 'default'}`
  },
})
