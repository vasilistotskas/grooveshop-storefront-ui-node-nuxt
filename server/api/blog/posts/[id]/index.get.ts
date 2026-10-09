import { getRouterParams, useRuntimeConfig } from 'nuxt/server'

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveBlogPostPath,
    )
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/post/${params.id}`, {
      method: 'GET',
    })
    return await parseDataAs(response, zRetrieveBlogPostResponse)
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: 'BlogPostDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60 * 2,
  swr: true,
  getKey: (event) => {
    const params = getRouterParams(event, { decode: true })
    return tenantCacheKey(event, `blog-post:${params.id}`)
  },
})
