export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogAuthorParams.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodBlogAuthor)
  }
  catch (error) {
    await handleError(error)
  }
})
