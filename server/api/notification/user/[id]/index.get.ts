export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveNotificationUserData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zRetrieveNotificationUserData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/notification/user/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
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
