import { ZodSessionsGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/sessions`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodSessionsGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
