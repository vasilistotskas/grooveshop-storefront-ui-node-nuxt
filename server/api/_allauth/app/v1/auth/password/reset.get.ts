import { defineEventHandler, getRequestHeader, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const key = getRequestHeader(event, 'X-Password-Reset-Key')
    const headers = await getAllAuthHeaders(event)
    if (key) {
      headers['X-Password-Reset-Key'] = key
    }
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodPasswordResetGetResponse)
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
