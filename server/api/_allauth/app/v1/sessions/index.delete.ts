import { ZodSessionsDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/sessions`, {
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodSessionsDeleteResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
