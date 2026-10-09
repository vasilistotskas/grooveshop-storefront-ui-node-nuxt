import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log
  wideLog?.set({ auth: { method: 'session' } })
  try {
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
      headers: await getAllAuthHeaders(event),
    })
    const sessionResponse = await parseDataAs(response, ZodSessionResponse)
    await processAllAuthSession(event, sessionResponse)
    if (sessionResponse.meta?.is_authenticated === false) {
      await clearUserSession(event)
    }
    return sessionResponse
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
