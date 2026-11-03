import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthCodeConfirmBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/code/confirm`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const confirmResponse = await parseDataAs(response, zPostAllauthAppV1AuthCodeConfirmResponse)
    await processAllAuthSession(event, confirmResponse)
    return confirmResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
