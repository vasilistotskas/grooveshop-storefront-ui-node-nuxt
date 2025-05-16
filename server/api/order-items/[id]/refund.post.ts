export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
    const body = await readValidatedBody(event, ZodOrderItem.parse)
    const url = `${config.apiBaseUrl}/order-items/${params.id}/refund`
    const response = await $fetch(url, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, ZodOrderItem)
  }
  catch (error) {
    await handleError(error)
  }
})
