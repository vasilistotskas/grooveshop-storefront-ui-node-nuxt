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
}, { name: 'ProductCategoryViewSet' })
