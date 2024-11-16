export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodPasswordResetPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const passwordResponse = await parseDataAs(response, ZodPasswordResetPostResponse)
    await processAllAuthSession(passwordResponse)
    return passwordResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
