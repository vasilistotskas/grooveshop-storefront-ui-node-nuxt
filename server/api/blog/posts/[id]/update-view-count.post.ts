export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zIncrementBlogPostViewsData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/post/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, zIncrementBlogPostViewsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
