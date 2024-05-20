import { ZodSessionsGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/sessions`, {
      method: 'GET',
      headers,
    })
    const sessionResponse = await parseDataAs(response, ZodSessionsGetResponse)
    await processAllAuthSession(sessionResponse)
    return sessionResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
