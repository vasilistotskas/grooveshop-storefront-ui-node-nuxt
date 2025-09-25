export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogTagData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/tag`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })

    // Handle the case where pagination=false returns an array instead of paginated object
    if (Array.isArray(response)) {
      // Transform array response to paginated structure
      const paginatedResponse = {
        count: response.length,
        totalPages: 1,
        pageSize: response.length,
        pageTotalResults: response.length,
        page: 1,
        links: {
          next: null,
          previous: null,
        },
        results: response,
      }
      return await parseDataAs(paginatedResponse, zListBlogTagResponse)
    }

    return await parseDataAs(response, zListBlogTagResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogTagViewSet' })
