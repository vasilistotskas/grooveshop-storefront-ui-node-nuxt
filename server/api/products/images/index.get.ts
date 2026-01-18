export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductImageData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/image`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductImageResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductImageViewSet',
  maxAge: 60 * 30, // 30 minutes
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    return `product-images:${JSON.stringify(query)}`
  },
})
