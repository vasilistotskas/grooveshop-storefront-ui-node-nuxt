import { ZodSessionsDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/sessions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodSessionsDeleteResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
