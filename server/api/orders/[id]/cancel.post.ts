export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
    const body = await readValidatedBody(event, ZodOrderDetail.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order/${params.id}/cancel`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodOrderDetail)
  }
  catch (error) {
    await handleError(error)
  }
})
