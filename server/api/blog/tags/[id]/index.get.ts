export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogTagParams.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/tag/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodBlogTag)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogTagViewSet' })
