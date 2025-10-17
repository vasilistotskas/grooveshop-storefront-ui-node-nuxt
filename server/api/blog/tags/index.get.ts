export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogTagData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/tag`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogTagResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogTagViewSet' })
