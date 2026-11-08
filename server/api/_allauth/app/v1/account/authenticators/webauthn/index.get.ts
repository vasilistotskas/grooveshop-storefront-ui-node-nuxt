import { z } from 'zod'
import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const query = await getValidatedQuery(event, z.object({
      passwordless: z.enum(['true', 'false']).optional(),
    }))
    // allauth asks for a passkey when the parameter is PRESENT, whatever
    // its value (`"passwordless" in request.GET`), so a security key must
    // not send it at all: forwarding `passwordless=false` made one a passkey.
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      method: 'GET',
      headers,
      query: query.passwordless === 'true' ? { passwordless: '' } : undefined,
    })
    return await parseDataAs(response, zGetAllauthAppV1AccountAuthenticatorsWebauthnResponse)
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
