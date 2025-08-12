export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountLikedBlogPostsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountLikedBlogPostsData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/user/account/${params.id}/liked_blog_posts`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountLikedBlogPostsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
