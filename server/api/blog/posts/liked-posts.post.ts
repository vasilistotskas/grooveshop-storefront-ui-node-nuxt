export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCheckBlogPostLikesData.shape.body.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/post/liked_posts`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zCheckBlogPostLikesResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
