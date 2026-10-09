import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodWebAuthnPutBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      body: validatedBody,
      method: 'PUT',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnPutResponse)
  }
  catch (error) {
    // WebAuthn rename 4xx payloads must reach the client toast layer —
    // thrown createError({data}) is stripped in production. Same
    // forward contract as the other authenticator routes.
    return await forwardAllAuthFlow(event, error)
  }
})
