export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnPostResponse)
  }
  catch (error) {
    // WebAuthn 4xx payloads (rejected credential, duplicate passkey,
    // reauthentication-required flows) must reach the client toast
    // layer — thrown createError({data}) is stripped in production.
    // Same forward contract as the other authenticator routes.
    return await forwardAllAuthFlow(error)
  }
})
