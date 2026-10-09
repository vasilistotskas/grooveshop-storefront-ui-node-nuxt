import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zCreateContactBody)
    // The backend fetch names this request's store in X-Forwarded-Host:
    // contact emails go to that tenant's support inbox, and the contact
    // row is stored in its schema.
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/contact`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zCreateContactResponse)
  }
  catch (error) {
    // Return Django 4xx bodies (DRF validation detail) so the client
    // can show WHAT was rejected — thrown createError({data}) is
    // stripped in production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
