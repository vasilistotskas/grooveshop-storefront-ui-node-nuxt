import { ZodSessionsGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/sessions`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodSessionsGetResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
