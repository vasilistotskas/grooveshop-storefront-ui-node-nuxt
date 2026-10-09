import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/login`, {
      method: 'GET',
      headers,
    })
    const loginResponse = await parseDataAs(response, ZodWebAuthnLoginGetResponse)
    await processAllAuthSession(event, loginResponse)
    return loginResponse
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
