export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/product/category`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, zListProductCategoryResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'ProductCategoryViewSet' })
