export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodOrderQuery.parse)
    const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/order/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodOrder)
  }
  catch (error) {
    await handleError(error)
  }
})
