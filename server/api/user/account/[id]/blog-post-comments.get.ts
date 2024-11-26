export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const query = await getValidatedQuery(event, ZodBlogCommentQuery.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/user/account/${params.id}/blog_post_comments`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
