export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCommentData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/comment`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCommentResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
