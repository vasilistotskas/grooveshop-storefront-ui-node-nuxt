export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnSignupPutBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/signup`, {
      body: validatedBody,
      method: 'PUT',
      headers,
    })
    const providerResponse = await parseDataAs(response, ZodWebAuthnSignupPutResponse)
    await processAllAuthSession(providerResponse)
    return providerResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
