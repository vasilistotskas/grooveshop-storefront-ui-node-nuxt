export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveBlogCategoryData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveBlogCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogCategoryDetail',
  maxAge: 60 * 30, // 30 minutes - categories change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `blog-category:${getRouterParams(event).id}`,
})
