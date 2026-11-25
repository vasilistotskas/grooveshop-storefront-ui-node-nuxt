import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthReauthenticateCodeRequestBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/reauthenticate/code/request`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const requestResponse = await parseDataAs(response, zPostAllauthAppV1AuthReauthenticateCodeRequestResponse)
    await processAllAuthSession(event, requestResponse)
    return requestResponse
  }
  catch (error) {
    // 400 (an address that is not the shopper's), 429 and 403 (the method is
    // off) are forwarded with their status.
    return await forwardAllAuthFlow(event, error)
  }
})
