import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveNotificationUserPath,
    )
    const query = await getValidatedQuery(event, zRetrieveNotificationUserQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/notification/user/${params.id}`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zRetrieveNotificationUserResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
