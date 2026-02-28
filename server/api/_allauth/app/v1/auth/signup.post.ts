export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = useLogger(event)
  wideLog.set({ auth: { method: 'signup' } })
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodSignupBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/signup`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const signupResponse = await parseDataAs(response, ZodSignupResponse)
    await processAllAuthSession(signupResponse)
    return signupResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
