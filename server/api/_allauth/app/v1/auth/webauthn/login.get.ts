import { ZodWebAuthnLoginGetResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/login`, {
      method: 'GET',
      headers,
    })
    const loginResponse = await parseDataAs(response, ZodWebAuthnLoginGetResponse)
    if (loginResponse.meta?.session_token) {
      appendResponseHeader(event, 'X-Session-Token', loginResponse.meta.session_token)
      await setUserSession(event, {
        sessionToken: loginResponse.meta.session_token,
      })
    }
    return loginResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
