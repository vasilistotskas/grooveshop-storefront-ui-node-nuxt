export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListBlogPostCommentsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListBlogPostCommentsData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/post/${params.id}/comments`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogPostCommentsResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogPostComments',
  maxAge: 60 * 5, // 5 minutes - comments can change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      getRouterParams(event).id || '',
      query.pageSize || '10',
      query.paginationType || 'cursor',
      query.cursor || '',
      query.languageCode || 'el',
    ]
    return `post-comments:${keyParts.join(':')}`
  },
})
