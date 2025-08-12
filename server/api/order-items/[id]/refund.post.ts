export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRefundOrderItemData.shape.path.parse,
    )
    const body = await readValidatedBody(event, zRefundOrderItemData.shape.body.parse)
    const url = `${config.apiBaseUrl}/order-items/${params.id}/refund`
    const response = await $fetch(url, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zRefundOrderItemResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
