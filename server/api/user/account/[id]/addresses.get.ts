export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountAddressesPath.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountAddressesQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/addresses`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountAddressesResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
