import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodEmailDeleteBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodEmailDeleteResponse)
  }
  catch (error) {
    // Account-management 4xx payloads (wrong password, duplicate email,
    // bad TOTP code, …) must reach the client toast layer — thrown
    // createError({data}) is stripped in production. Same forward
    // contract as the auth flow routes.
    return await forwardAllAuthFlow(event, error)
  }
})
