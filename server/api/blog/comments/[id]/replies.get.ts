export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogCommentRepliesData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListBlogCommentRepliesData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/blog/comment/${params.id}/replies`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogCommentRepliesResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
