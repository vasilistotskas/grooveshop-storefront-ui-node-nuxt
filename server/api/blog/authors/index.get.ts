export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogAuthorData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/author`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogAuthorResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogAuthorViewSet' })
