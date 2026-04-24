export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveNotificationUserPath.parse,
    )
    const query = await getValidatedQuery(event, zRetrieveNotificationUserQuery.parse)
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
