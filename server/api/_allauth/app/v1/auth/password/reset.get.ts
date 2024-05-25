import { ZodPasswordResetGetResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const key = getRequestHeader(event, 'X-Password-Reset-Key')
    const headers = {
      'X-Password-Reset-Key': key,
    } as Record<string, string>
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodPasswordResetGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
