import { defineEventHandler, getValidatedQuery, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zCreateBlogCommentBody)
    const query = await getValidatedQuery(event, zCreateBlogCommentQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/comment`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateBlogCommentResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
