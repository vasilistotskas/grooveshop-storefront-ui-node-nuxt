import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthProviderSignupBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/provider/signup`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const providerResponse = await parseDataAs(response, zPostAllauthAppV1AuthProviderSignupResponse)
    await processAllAuthSession(event, providerResponse)
    return providerResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
