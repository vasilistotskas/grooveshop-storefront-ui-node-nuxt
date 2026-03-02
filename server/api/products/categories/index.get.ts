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
    })
    return await parseDataAs(response, zListProductCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductCategoryViewSet',
  maxAge: 60 * 60, // 1 hour cache - categories rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
      query.idIn || '',
    ]
    return tenantCacheKey(event, `product-categories:${keyParts.join(':')}`)
  },
})
