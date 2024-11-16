export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodProviderTokenBody.parse)
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/provider/token`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const tokenResponse = await parseDataAs(response, ZodProviderTokenResponse)
    await processAllAuthSession(tokenResponse)
    return tokenResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
