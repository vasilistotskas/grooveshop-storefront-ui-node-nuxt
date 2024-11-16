export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodReauthenticateBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/reauthenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const reauthenticateResponse = await parseDataAs(response, ZodReauthenticateResponse)
    await processAllAuthSession(reauthenticateResponse)
    return reauthenticateResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
