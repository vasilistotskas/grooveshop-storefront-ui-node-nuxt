export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogAuthorData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/author/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogAuthorResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogAuthorViewSet' })
