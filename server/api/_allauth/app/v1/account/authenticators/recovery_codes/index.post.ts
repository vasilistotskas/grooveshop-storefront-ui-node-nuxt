import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/authenticators/recovery_codes`, {
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
