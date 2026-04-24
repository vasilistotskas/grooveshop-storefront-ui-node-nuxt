export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountOrdersPath.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountOrdersQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/orders`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountOrdersResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
