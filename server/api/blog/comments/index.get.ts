export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCommentData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/comment`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogCommentResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
