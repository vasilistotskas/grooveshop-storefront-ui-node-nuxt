export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()

  try {
    const response = await $fetch(`${config.apiBaseUrl}/product/brand/all`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListAllBrandResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ProductBrandAll',
  maxAge: 60 * 60, // 1 hour cache - brands rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => tenantCacheKey(event, 'product-brands-all'),
})
