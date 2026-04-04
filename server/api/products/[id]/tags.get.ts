export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListProductTagsPath.parse,
    )
    const query = await getValidatedQuery(event, zListProductTagsQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/${params.id}/tags`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductTagsResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductTagsViewSet',
  maxAge: 60 * 60,
  staleMaxAge: 60 * 60 * 24,
  swr: true,
  getKey: event => `product-tags:${getRouterParam(event, 'id')}`,
})
