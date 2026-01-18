export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogTagData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/tag/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogTagResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogTagDetail',
  maxAge: 60 * 30, // 30 minutes - tags change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `blog-tag:${getRouterParams(event).id}`,
})
