export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zRequestUserAccountDataExportPath.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/account/${params.id}/request_data_export`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zRequestUserAccountDataExportResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
