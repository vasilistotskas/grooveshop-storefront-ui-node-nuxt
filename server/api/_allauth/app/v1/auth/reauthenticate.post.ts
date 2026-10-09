import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodReauthenticateBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/reauthenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const reauthenticateResponse = await parseDataAs(response, ZodReauthenticateResponse)
    await processAllAuthSession(event, reauthenticateResponse)
    return reauthenticateResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
