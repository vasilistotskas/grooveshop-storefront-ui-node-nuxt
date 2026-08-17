export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodSessionsDeleteBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/sessions`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodSessionsDeleteResponse)
  }
  catch (error) {
    // Account-management 4xx payloads (wrong password, duplicate email,
    // bad TOTP code, …) must reach the client toast layer — thrown
    // createError({data}) is stripped in production. Same forward
    // contract as the auth flow routes.
    return await forwardAllAuthFlow(error)
  }
})
