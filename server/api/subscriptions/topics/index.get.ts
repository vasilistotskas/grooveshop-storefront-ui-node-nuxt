export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListSubscriptionTopicData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/subscription/topic`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListSubscriptionTopicResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
