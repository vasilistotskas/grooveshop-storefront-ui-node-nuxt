export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogAuthorData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/author/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogAuthorResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogAuthorDetail',
  maxAge: 60 * 60, // 1 hour - authors change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `blog-author:${getRouterParams(event).id}`,
})
