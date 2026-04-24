export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountNotificationsPath.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountNotificationsQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/notifications`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountNotificationsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
