export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogPostRelatedData.shape.path.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/blog/post/${params.id}/related_posts`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogPostRelatedResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
