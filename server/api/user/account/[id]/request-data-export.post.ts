import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zRequestUserAccountDataExportPath,
    )
    const response = await useBackendFetch(event)(
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
    handleError(event, error)
  }
})
