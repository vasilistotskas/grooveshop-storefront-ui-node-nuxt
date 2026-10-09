import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodTwoFaReauthenticateBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/2fa/reauthenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const reauthenticateResponse = await parseDataAs(response, ZodTwoFaReauthenticateResponse)
    await processAllAuthSession(event, reauthenticateResponse)
    return reauthenticateResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
