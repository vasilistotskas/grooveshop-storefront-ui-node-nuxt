import { ZodTotpGetResponse, ZodTotpGetResponseError } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodTotpGetResponse)
  }
  catch (error) {
    if (isAllAuthError(error)) {
      if (error.data.status === 404 && 'meta' in error.data) {
        return await parseDataAs(error.data, ZodTotpGetResponseError)
      }
      await handleAllAuthError(error)
    }
  }
})
