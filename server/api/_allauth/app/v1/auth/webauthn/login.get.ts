export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/login`, {
      method: 'GET',
      headers,
    })
    const loginResponse = await parseDataAs(response, ZodWebAuthnLoginGetResponse)
    await processAllAuthSession(loginResponse)
    return loginResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
