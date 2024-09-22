import { ZodConfigResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch.raw(`${config.djangoUrl}/_allauth/browser/v1/config`, {
      method: 'GET',
      credentials: 'include',
    })

    const csrfCookie = response.headers.get('set-cookie')?.split(';').find(cookie => cookie.trim().startsWith('csrftoken'))

    if (csrfCookie) {
      setResponseHeader(event, 'X-CSRFToken', csrfCookie.split('=')[1])
    }

    return await parseDataAs(response._data, ZodConfigResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
