export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCategoryParams.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodBlogCategory)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogCategoryViewSet' })
