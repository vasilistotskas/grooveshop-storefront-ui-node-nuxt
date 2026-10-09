import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/recovery-codes`, {
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodRecoveryCodesGetResponse)
  }
  catch (error) {
    // Account-management 4xx payloads (wrong password, duplicate email,
    // bad TOTP code, …) must reach the client toast layer — thrown
    // createError({data}) is stripped in production. Same forward
    // contract as the auth flow routes.
    return await forwardAllAuthFlow(event, error)
  }
})
