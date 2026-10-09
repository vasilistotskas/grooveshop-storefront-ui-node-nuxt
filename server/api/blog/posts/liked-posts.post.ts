import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zCheckBlogPostLikesBody)
    const response = await useBackendFetch(event)(
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
    handleError(event, error)
  }
})
