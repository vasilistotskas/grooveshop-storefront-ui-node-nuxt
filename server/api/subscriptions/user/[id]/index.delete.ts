import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zDestroyUserSubscriptionPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/subscription/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zDestroyUserSubscriptionResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
