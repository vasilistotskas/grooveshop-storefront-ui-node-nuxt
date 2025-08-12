export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogTagData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/tag`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogTagResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogTagViewSet' })
