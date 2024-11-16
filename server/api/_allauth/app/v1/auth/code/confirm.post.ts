export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodCodeConfirmBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/code/confirm`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const confirmResponse = await parseDataAs(response, ZodCodeConfirmResponse)
    await processAllAuthSession(confirmResponse)
    return confirmResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
