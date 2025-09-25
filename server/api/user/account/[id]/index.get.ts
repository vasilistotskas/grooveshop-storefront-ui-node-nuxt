export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveUserAccountData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/account/${params.id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zRetrieveUserAccountResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
