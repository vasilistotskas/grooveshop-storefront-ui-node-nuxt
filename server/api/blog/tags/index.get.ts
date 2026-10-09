import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogTagQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/tag`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogTagResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogTagViewSet',
  maxAge: 60 * 30, // 30 minutes - tags change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
      query.page || '1',
    ]
    return tenantCacheKey(event, `blog-tags:${keyParts.join(':')}`)
  },
})
