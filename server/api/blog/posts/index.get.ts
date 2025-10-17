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
}, { name: 'BlogPostViewSet' })
