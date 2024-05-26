import { ZodSessionResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
      headers,
    })
    const sessionResponse = await parseDataAs(response, ZodSessionResponse)
    await processAllAuthSession(sessionResponse)
    return sessionResponse
  }
  catch (error) {
    await handleAllAuthError(error)
    await clearUserSession(event)
  }
})
