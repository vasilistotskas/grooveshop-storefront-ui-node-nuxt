export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCategoryPostsData.shape.query.parse)
    const params = await getValidatedRouterParams(
      event,
      zListBlogCategoryPostsData.shape.path.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/blog/category/${params.id}/posts`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCategoryPostsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
