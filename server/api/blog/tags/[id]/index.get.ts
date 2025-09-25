export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogTagData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/tag/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogTagResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogTagViewSet' })
