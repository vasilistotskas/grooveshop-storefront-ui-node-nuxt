export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnDeleteBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnDeleteResponse)
  }
  catch (error) {
    // WebAuthn removal 4xx payloads (e.g. reauthentication required)
    // must reach the client toast layer — thrown createError({data})
    // is stripped in production. Same forward contract as the other
    // authenticator routes.
    return await forwardAllAuthFlow(error)
  }
})
