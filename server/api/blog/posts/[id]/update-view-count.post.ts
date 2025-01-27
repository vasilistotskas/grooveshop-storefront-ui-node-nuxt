export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/post/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, ZodBlogPost)
  }
  catch (error) {
    await handleError(error)
  }
})
