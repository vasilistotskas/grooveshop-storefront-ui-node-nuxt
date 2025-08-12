export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      zGetMyBlogCommentData.shape.body.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/comment/my_comment`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zGetMyBlogCommentResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
