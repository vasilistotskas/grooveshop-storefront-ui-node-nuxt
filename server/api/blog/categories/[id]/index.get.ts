export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogCategoryData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogCategoryViewSet' })
