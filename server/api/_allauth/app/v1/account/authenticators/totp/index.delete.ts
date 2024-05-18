import { ZodTotpDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodTotpDeleteResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
