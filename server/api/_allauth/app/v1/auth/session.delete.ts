import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log
  wideLog?.set({ auth: { method: 'logout' } })
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'DELETE',
      headers,
    })
    const parsed = await parseDataAs(response, ZodPasswordRequestResponse)
    return parsed
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
  finally {
    // Promise.allSettled so a throw in clearUserSession (e.g. seal failure
    // during a NUXT_SESSION_PASSWORD rotation) doesn't abort clearCartSession,
    // leaving a stale cart cookie behind after logout.
    await Promise.allSettled([
      clearUserSession(event),
      clearCartSession(event),
    ])
  }
})
