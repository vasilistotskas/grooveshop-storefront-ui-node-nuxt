import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zGetUserAccountNotificationsPath,
    )
    const query = await getValidatedQuery(event, zGetUserAccountNotificationsQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/account/${params.id}/notifications`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountNotificationsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
