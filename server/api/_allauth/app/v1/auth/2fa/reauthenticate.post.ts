import { ZodTwoFaReauthenticateResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/2fa/reauthenticate`, {
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodTwoFaReauthenticateResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
