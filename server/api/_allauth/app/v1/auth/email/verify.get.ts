import { ZodEmailVerifyGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/email/verify`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodEmailVerifyGetResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
