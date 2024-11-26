export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const query = await getValidatedQuery(event, ZodBlogCommentQuery.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/blog/comment/${params.id}/replies`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
