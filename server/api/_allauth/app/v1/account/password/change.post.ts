export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodPasswordChangeBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/password/change`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const passwordChangeResponse = await parseDataAs(response, ZodSessionResponse)
    await processAllAuthSession(passwordChangeResponse)
    // ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE=True: Django revokes the Knox token on
    // password change. Clear the Nuxt encrypted session cookie so the stale
    // accessToken is not forwarded on subsequent requests.
    if (passwordChangeResponse.meta?.is_authenticated === false) {
      await clearUserSession(event)
    }
    return passwordChangeResponse
  }
  catch (error) {
    // Account-management 4xx payloads (wrong password, duplicate email,
    // bad TOTP code, …) must reach the client toast layer — thrown
    // createError({data}) is stripped in production. Same forward
    // contract as the auth flow routes.
    return await forwardAllAuthFlow(error)
  }
})
