export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogPostRelatedData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListBlogPostRelatedData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/blog/post/${params.id}/related_posts`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogPostRelatedResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
