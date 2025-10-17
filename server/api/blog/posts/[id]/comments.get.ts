export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogPostCommentsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListBlogPostCommentsData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/post/${params.id}/comments`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogPostCommentsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
