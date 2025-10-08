export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, zRetrieveSubscriptionTopicData.shape.path.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/user/subscription/topic/${params.id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zRetrieveSubscriptionTopicResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
