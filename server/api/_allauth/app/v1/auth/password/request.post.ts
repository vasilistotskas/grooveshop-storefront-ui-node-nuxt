export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodPasswordRequestBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/password/request`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodPasswordRequestResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
