export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductViewSet',
  maxAge: 300, // Cache for 5 minutes
  staleMaxAge: 600, // Serve stale for 10 minutes while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '12',
      query.page || '1',
      query.ordering || '-createdAt',
      query.categoryId || 'all',
      query.search || '',
    ]
    return `products:${keyParts.join(':')}`
  },
})
