export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCategoryParams.parse,
    )

    const url = buildFullUrl(`${config.apiBaseUrl}/blog/category/${params.id}/posts`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })

    return await parseDataAs(response, ZodPagination(ZodBlogPost))
  }
  catch (error) {
    await handleError(error)
  }
})
