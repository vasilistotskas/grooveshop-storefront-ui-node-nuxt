import { ZodTotpGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodTotpGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
