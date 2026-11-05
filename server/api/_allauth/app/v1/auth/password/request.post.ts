import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, zPostAllauthAppV1AuthPasswordRequestBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/password/request`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, zPostAllauthAppV1AuthPasswordRequestResponse)
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
