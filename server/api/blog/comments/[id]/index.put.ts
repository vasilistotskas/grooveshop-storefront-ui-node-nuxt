export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodBlogCommentPutBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/review/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, ZodBlogComment)
  }
  catch (error) {
    await handleError(error)
  }
})
