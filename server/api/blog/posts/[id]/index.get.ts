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
}, { name: 'BlogPostViewSet' })
