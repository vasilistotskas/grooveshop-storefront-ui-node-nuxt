import { ZodEmailGetResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/email`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodEmailGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
