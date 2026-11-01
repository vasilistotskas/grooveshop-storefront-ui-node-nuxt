import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Turn store marketing emails on or off for the signed-in customer's own
 * address. Turning one on lifts the opt-out that covers it, including one
 * left by "stop all marketing emails" on the unsubscribe page; the other
 * choices stand. Django answers with the whole list, as the GET does.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zUpdateEmailPreferencesBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/email-preferences`, {
      method: 'PATCH',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zUpdateEmailPreferencesResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
