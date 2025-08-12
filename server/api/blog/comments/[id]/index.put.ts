export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zUpdateBlogCommentData.shape.body.parse)
    const params = await getValidatedRouterParams(
      event,
      zUpdateBlogCommentData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/comment/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zUpdateBlogCommentResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
