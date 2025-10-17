export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogAuthorData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/author`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogAuthorResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogAuthorViewSet' })
