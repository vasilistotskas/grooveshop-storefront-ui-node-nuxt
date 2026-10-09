import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zGetUserAccountLikedBlogPostsPath,
    )
    const query = await getValidatedQuery(event, zGetUserAccountLikedBlogPostsQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/account/${params.id}/liked_blog_posts`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountLikedBlogPostsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
