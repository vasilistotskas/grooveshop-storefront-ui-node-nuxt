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
}, {
  name: 'BlogAuthorViewSet',
  maxAge: 60 * 60, // 1 hour - authors change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.page || '1',
      query.languageCode || 'el',
    ]
    return `blog-authors:${keyParts.join(':')}`
  },
})
