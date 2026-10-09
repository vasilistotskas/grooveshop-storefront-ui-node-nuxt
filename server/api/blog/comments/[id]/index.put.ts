import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zUpdateBlogCommentBody)
    const params = await parseRouterParams(
      event,
      zUpdateBlogCommentPath,
    )
    const response = await useBackendFetch(event)(
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
    handleError(event, error)
  }
})
