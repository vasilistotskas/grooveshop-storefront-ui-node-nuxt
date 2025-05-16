export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, ZodOrderUUIDParams.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/order/uuid/${params.uuid}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, ZodOrderDetail)
  }
  catch (error) {
    await handleError(error)
  }
})
