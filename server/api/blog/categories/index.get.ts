import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCategoryQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/category`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCategoryResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogCategoryViewSet',
  maxAge: 60 * 30, // 30 minutes - categories change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
    ]
    return tenantCacheKey(event, `blog-categories:${keyParts.join(':')}`)
  },
})
