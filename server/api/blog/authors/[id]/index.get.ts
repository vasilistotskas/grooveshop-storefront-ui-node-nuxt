const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogAuthorParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodBlogAuthor)
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'BlogAuthorViewSet' })
