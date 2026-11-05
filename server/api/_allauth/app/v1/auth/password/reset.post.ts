import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthPasswordResetBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const passwordResponse = await parseDataAs(response, zPostAllauthAppV1AuthPasswordResetResponse)
    await processAllAuthSession(event, passwordResponse)
    return passwordResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
