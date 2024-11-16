export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnAuthenticatePostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/authenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const providerResponse = await parseDataAs(response, ZodWebAuthnAuthenticatePostResponse)
    await processAllAuthSession(providerResponse)
    return providerResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
