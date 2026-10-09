import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zListUserAccountDataExportsPath,
    )
    const response = await useBackendFetch(event)(
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
    handleError(event, error)
  }
})
