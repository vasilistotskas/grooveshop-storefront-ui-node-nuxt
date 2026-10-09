import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/sessions`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodSessionsGetResponse)
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
