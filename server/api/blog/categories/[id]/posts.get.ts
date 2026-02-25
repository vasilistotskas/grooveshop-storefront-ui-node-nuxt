export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogCategoryPostsData.shape.query.parse)
    const params = await getValidatedRouterParams(
      event,
      zListBlogCategoryPostsData.shape.path.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/blog/category/${params.id}/posts`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListBlogCategoryPostsResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'BlogCategoryPostsViewSet',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => `blog-category-posts:${getRouterParam(event, 'id')}:${JSON.stringify(getQuery(event))}`,
})
