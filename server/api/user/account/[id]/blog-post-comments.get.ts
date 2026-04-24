export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountBlogPostCommentsPath.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountBlogPostCommentsQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/blog_post_comments`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountBlogPostCommentsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
