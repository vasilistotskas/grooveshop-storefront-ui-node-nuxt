export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCategoryPostsData.shape.query.parse)
    const params = await getValidatedRouterParams(
      event,
      zListBlogCategoryPostsData.shape.path.parse,
    )

    const url = buildFullUrl(`${config.apiBaseUrl}/blog/category/${params.id}/posts`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })

    return await parseDataAs(response, zListBlogCategoryPostsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
