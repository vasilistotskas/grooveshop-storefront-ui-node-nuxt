export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateBlogCommentData.shape.body.parse)
    const query = await getValidatedQuery(event, zCreateBlogCommentData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/comment`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateBlogCommentResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
