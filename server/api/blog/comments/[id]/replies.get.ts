export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogCommentRepliesData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListBlogCommentRepliesData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/comment/${params.id}/replies`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCommentRepliesResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
