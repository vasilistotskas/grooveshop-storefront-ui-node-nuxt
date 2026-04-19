import { z } from 'zod'

/**
 * Trending Search Queries proxy.
 *
 * Forwards to Django's `/search/trending` which aggregates SearchQuery
 * over the last 24h and caches the result for 5 minutes in Redis.
 */

const zQuery = z.object({
  languageCode: z.string().optional(),
  contentType: z.enum(['product', 'blog_post', 'federated']).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

const zResult = z.object({
  query: z.string(),
  count: z.number().int().nonnegative(),
})

const zResponse = z.object({
  window_hours: z.number().int(),
  content_type: z.string(),
  language_code: z.string().nullable(),
  results: z.array(zResult),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zQuery.parse)
    const backendQuery: Record<string, unknown> = {}
    if (query.languageCode) backendQuery.language_code = query.languageCode
    if (query.contentType) backendQuery.content_type = query.contentType
    if (query.limit != null) backendQuery.limit = query.limit

    const response = await $fetch(`${config.apiBaseUrl}/search/trending`, {
      method: 'GET',
      query: backendQuery,
    })

    return await parseDataAs(response, zResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
