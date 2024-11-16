export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodTwoFaAuthenticateBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/2fa/authenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const authenticateResponse = await parseDataAs(response, ZodTwoFaAuthenticateResponse)
    await processAllAuthSession(authenticateResponse)
    return authenticateResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
