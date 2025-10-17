export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCategoryData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/category`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogCategoryViewSet' })
