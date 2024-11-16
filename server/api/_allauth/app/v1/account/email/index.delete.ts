export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodEmailDeleteBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodEmailDeleteResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
