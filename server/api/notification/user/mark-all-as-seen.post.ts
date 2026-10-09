import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/notification/user/mark_all_as_seen`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zMarkAllNotificationUsersAsSeenResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
