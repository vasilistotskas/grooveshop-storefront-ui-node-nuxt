export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveNotificationUserData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zRetrieveNotificationUserData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/notification/user/${params.id}`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zRetrieveNotificationUserResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
