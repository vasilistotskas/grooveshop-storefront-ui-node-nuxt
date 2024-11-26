export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProductCategoryParams.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodProductCategory)
  }
  catch (error) {
    await handleError(error)
  }
})
