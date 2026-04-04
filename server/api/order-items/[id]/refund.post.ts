export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRefundOrderItemPath.parse,
    )
    const body = await readValidatedBody(event, zRefundOrderItemBody.parse)
    const url = `${config.apiBaseUrl}/order-items/${params.id}/refund`
    const response = await $fetch(url, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zRefundOrderItemResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
