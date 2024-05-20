import { ZodTotpDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodTotpDeleteResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
