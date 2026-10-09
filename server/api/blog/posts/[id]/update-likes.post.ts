import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zToggleBlogPostLikePath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/blog/post/${params.id}/update_likes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zToggleBlogPostLikeResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
