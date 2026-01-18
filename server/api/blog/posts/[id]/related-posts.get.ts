export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogPostRelatedData.shape.path.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/blog/post/${params.id}/related_posts`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogPostRelatedResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogPostRelatedPosts',
  maxAge: 60 * 15, // 15 minutes - related posts can change when new posts are added
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `related-posts:${getRouterParams(event).id}`,
})
