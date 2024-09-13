import { ZodProvidersGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/providers`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodProvidersGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
