import { ZodConfigResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/config`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodConfigResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
