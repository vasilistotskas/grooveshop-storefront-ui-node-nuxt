export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountAddressesData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountAddressesData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/user/account/${params.id}/addresses`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
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
