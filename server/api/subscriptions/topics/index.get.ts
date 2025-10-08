export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListSubscriptionTopicData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/user/subscription/topic`, query)

    const response = await $fetch(url, {
      method: 'GET',
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
