export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListUserSubscriptionData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/subscription`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListUserSubscriptionResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
