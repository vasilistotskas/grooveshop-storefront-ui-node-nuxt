import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log
  wideLog?.set({ auth: { method: 'login' } })
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthLoginBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/login`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const loginResponse = await parseDataAs(response, zPostAllauthAppV1AuthLoginResponse)
    await processAllAuthSession(event, loginResponse)
    return loginResponse
  }
  catch (error) {
    // A pending-flow 401 (2FA required) is forwarded to the client so it can
    // route to the second factor; genuine errors still throw.
    return await forwardAllAuthFlow(event, error)
  }
})
