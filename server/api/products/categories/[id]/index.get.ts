export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveProductCategoryData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zRetrieveProductCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'ProductCategoryDetail',
  maxAge: 60 * 60, // 1 hour - categories change rarely
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `product-category:${getRouterParams(event).id}`,
})
