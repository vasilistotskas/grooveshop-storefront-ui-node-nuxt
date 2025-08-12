export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zToggleBlogCommentLikeData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/comment/${params.id}/update_likes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zToggleBlogCommentLikeResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
