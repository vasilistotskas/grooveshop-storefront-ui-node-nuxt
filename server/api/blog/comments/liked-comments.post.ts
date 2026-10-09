import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(
      event,
      zCheckBlogCommentLikesBody,
    )

    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/blog/comment/liked_comments`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zCheckBlogCommentLikesResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
