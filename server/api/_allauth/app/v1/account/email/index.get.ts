import { ZodEmailGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/email`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodEmailGetResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
