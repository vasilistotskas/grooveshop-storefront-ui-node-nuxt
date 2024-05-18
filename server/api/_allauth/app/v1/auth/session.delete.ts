import { z } from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'DELETE',
    })
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
