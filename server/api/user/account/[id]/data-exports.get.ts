export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListUserAccountDataExportsPath.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/account/${params.id}/data_exports`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zListUserAccountDataExportsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
