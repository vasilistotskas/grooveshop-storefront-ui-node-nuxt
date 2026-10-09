import { defineEventHandler, readValidatedBody, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(
      event,
      zApiV1SearchClickCreateBody,
    )
    await useBackendFetch(event)(`${config.apiBaseUrl}/search/click`, {
      method: 'POST',
      body,
      headers: createHeaders(event, null, null),
    })
    setResponseStatus(event, 202)
    return null
  }
  catch (error) {
    handleError(event, error)
  }
})
