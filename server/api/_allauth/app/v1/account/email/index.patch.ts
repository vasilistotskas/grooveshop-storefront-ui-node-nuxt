export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodEmailPatchBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'PATCH',
      headers,
    })
    return await parseDataAs(response, ZodEmailPatchResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
