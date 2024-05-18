import { z } from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/authenticators/recovery_codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
