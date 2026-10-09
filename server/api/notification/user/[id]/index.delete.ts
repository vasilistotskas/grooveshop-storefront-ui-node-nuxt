import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zDestroyNotificationUserPath,
    )
    await useBackendFetch(event)(
      `${config.apiBaseUrl}/notification/user/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return { success: true }
  }
  catch (error) {
    handleError(event, error)
  }
})
