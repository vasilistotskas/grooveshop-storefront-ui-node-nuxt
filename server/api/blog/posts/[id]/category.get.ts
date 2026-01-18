export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogPostData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zRetrieveBlogPostData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/post/${params.id}/category`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zRetrieveBlogCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogPostCategory',
  maxAge: 60 * 30, // 30 minutes - post category rarely changes
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `post-category:${getRouterParams(event).id}`,
})
