export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountAddressesData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zUserAddressDetail)
  }
  catch (error) {
    await handleError(error)
  }
})
