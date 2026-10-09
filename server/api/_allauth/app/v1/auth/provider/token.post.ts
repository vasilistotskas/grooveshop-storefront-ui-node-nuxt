import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodProviderTokenBody)
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/provider/token`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const tokenResponse = await parseDataAs(response, ZodProviderTokenResponse)
    await processAllAuthSession(event, tokenResponse)
    return tokenResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
