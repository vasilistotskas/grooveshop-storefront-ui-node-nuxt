export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductImageParams.parse)
    const query = await getValidatedQuery(event, ZodProductImageQuery.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/image/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodProductImage)
  }
  catch (error) {
    await handleError(error)
  }
})
