export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCategoryData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/category`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogCategoryViewSet' })
