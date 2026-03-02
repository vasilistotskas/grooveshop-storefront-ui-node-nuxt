export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogPostData.shape.path.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/blog/post/${params.id}`, {
      method: 'GET',
    })
    return await parseDataAs(response, zRetrieveBlogPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogPostDetailViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60 * 2,
  swr: true,
  getKey: (event) => {
    const params = getRouterParams(event)
    return tenantCacheKey(event, `blog-post:${params.id}`)
  },
})
