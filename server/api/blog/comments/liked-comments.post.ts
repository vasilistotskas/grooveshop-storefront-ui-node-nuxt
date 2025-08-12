export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      zCheckBlogCommentLikesData.shape.body.parse,
    )

    const response = await $fetch(
      `${config.apiBaseUrl}/blog/comment/liked_comments`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zCheckBlogCommentLikesResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
