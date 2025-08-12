export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveOrderItemData.shape.path.parse,
    )
    const url = `${config.apiBaseUrl}/order-items/${params.id}`
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zRetrieveOrderItemResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
