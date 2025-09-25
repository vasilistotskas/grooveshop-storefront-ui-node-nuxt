export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogPostData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zRetrieveBlogPostData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/blog/post/${params.id}/category`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zRetrieveBlogCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
