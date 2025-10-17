export default defineEventHandler(async (event) => {
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
})
