export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountBlogPostCommentsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountBlogPostCommentsData.shape.query.parse)
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
    return await parseDataAs(response, zGetUserAccountBlogPostCommentsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
