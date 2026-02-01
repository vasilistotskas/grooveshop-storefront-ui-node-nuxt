export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()

  try {
    const response = await $fetch(`${config.apiBaseUrl}/product/category/all`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListAllProductCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductCategoryAll',
  maxAge: 60 * 60, // 1 hour cache - categories rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
})
