import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, zGetAllauthAppV1AccountAuthenticatorsTotpResponse)
  }
  catch (error) {
    // No authenticator yet: allauth answers 404 with the secret to enrol with.
    if (isNotFoundResponseError(error)) {
      return error.data
    }
    await handleAllAuthError(event, error)
  }
})
