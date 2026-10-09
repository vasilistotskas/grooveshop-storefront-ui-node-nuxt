import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zListBlogCommentRepliesPath,
    )
    const query = await getValidatedQuery(event, zListBlogCommentRepliesQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/comment/${params.id}/replies`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCommentRepliesResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
