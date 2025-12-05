export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogPostData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/post`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogPostViewSet',
  maxAge: 60 * 10, // 10 minutes cache for better performance
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
})
