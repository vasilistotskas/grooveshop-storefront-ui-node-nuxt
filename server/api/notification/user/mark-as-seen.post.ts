import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zMarkNotificationUsersAsSeenBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/notification/user/mark_as_seen`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zMarkNotificationUsersAsSeenResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
