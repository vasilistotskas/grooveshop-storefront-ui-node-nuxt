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
}, {
  name: 'BlogTagViewSet',
  maxAge: 60 * 30, // 30 minutes - tags change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
      query.page || '1',
    ]
    return `blog-tags:${keyParts.join(':')}`
  },
})
