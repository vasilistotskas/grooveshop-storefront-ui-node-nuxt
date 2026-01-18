export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveProductImageData.shape.path.parse)
    const query = await getValidatedQuery(event, zRetrieveProductImageData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/image/${params.id}`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zRetrieveProductImageResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductImageDetail',
  maxAge: 60 * 30, // 30 minutes
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `product-image:${getRouterParams(event).id}`,
})
