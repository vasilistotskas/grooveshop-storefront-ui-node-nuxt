import { ZodPasswordResetGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPasswordResetGetResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
