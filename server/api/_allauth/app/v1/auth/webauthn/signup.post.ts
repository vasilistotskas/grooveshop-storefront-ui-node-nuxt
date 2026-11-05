import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthWebauthnSignupBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/signup`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    // The document gives this operation no 2xx: allauth answers the 401 of
    // the pending signup flow.
    return response
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
