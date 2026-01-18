export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCommentData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/comment`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCommentResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogCommentViewSet',
  maxAge: 60 * 5, // 5 minutes - comments can change frequently
  staleMaxAge: 60 * 60, // Serve stale for 1 hour while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.page || '1',
      query.languageCode || 'el',
      query.paginationType || 'pageNumber',
      query.cursor || '',
    ]
    return `blog-comments:${keyParts.join(':')}`
  },
})
