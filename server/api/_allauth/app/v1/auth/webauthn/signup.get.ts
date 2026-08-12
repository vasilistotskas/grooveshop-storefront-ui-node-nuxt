export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/signup`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnSignupGetResponse)
  }
  catch (error) {
    // Align with signup.post/.put: the signup flow's 4xx payloads
    // (pending mfa_webauthn_signup flow, conflict) must survive to the
    // client — thrown createError({data}) is stripped in production.
    return await forwardAllAuthFlow(error)
  }
})
