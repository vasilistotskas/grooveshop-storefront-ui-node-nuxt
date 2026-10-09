import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodTwoFaAuthenticateBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/2fa/authenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const authenticateResponse = await parseDataAs(response, ZodTwoFaAuthenticateResponse)
    await processAllAuthSession(event, authenticateResponse)
    return authenticateResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
