export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogCommentQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/comment`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
