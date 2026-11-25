import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/totp/svg`, {
      method: 'GET',
      headers,
    })
    // A shopper who has the authenticator: allauth's status, a 200.
    return await parseDataAs(response, zGetAllauthAppV1AccountAuthenticatorsTotpSvgResponse)
  }
  catch (error) {
    if (isAllAuthError(error)) {
      if (error.data.status === 404 && 'meta' in error.data) {
        return await parseDataAs(error.data, ZodTotpSvgSetup)
      }
    }
    await handleAllAuthError(event, error)
  }
})
