import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AccountPasswordChangeBody)
    // The document gives this operation no 2xx: Django logs the account out on
    // a password change (ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE) and answers 401.
    return await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/password/change`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
  }
  catch (error) {
    // Account-management 4xx payloads (wrong password, duplicate email,
    // bad TOTP code, …) must reach the client toast layer — thrown
    // createError({data}) is sent in a second, nested shape in production (data.data). Same forward
    // contract as the auth flow routes.
    return await forwardAllAuthFlow(event, error)
  }
})
