import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthReauthenticateCodeConfirmBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/reauthenticate/code/confirm`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const confirmResponse = await parseDataAs(response, zPostAllauthAppV1AuthReauthenticateCodeConfirmResponse)
    await processAllAuthSession(event, confirmResponse)
    return confirmResponse
  }
  catch (error) {
    // 400 (a wrong code) and 409 (no code is pending) are forwarded.
    return await forwardAllAuthFlow(event, error)
  }
})
