import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zDeleteAllauthAppV1AccountAuthenticatorsWebauthnBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, zDeleteAllauthAppV1AccountAuthenticatorsWebauthnResponse)
  }
  catch (error) {
    // WebAuthn removal 4xx payloads (e.g. reauthentication required)
    // must reach the client toast layer — thrown createError({data})
    // is sent in a second, nested shape in production (data.data). Same forward contract as the other
    // authenticator routes.
    return await forwardAllAuthFlow(event, error)
  }
})
