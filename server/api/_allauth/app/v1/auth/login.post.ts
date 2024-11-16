export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodLoginBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/login`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const loginResponse = await parseDataAs(response, ZodLoginResponse)
    await processAllAuthSession(loginResponse)
    return loginResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
