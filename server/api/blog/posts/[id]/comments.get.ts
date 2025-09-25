export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogPostCommentsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListBlogPostCommentsData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/blog/post/${params.id}/comments`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogPostCommentsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
