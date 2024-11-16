export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodEmailPutBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'PUT',
      headers,
    })
    return await parseDataAs(response, ZodEmailPutResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
