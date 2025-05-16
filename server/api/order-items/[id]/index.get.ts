export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
    const url = `${config.apiBaseUrl}/order-items/${params.id}`
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodOrderItem)
  }
  catch (error) {
    await handleError(error)
  }
})
