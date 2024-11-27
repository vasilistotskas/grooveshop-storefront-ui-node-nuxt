export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogAuthorQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/author`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogAuthor))
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogAuthorViewSet' })
