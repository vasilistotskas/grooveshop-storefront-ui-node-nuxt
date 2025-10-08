export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListUserSubscriptionData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/user/subscription`, query)

    const response = await $fetch(url, {
      method: 'GET',
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
